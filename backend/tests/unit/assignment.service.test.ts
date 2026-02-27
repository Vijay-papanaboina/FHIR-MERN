import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/AppError.js";

const userModelMocks = vi.hoisted(() => ({
  User: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

const assignmentRepoMocks = vi.hoisted(() => ({
  createAssignment: vi.fn(),
  deactivateAssignment: vi.fn(),
  getAssignmentsByPatient: vi.fn(),
  getAssignmentsByUser: vi.fn(),
  getAssignmentById: vi.fn(),
  findActiveAssignment: vi.fn(),
}));

vi.mock("../../src/models/auth.model.js", () => userModelMocks);
vi.mock("../../src/repositories/assignment.repository.js", () => assignmentRepoMocks);

import {
  assignPatient,
  getPatientAssignments,
  getPractitioners,
  getUserAssignments,
  removeAssignment,
} from "../../src/services/assignment.service.js";

describe("assignment.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks self assignment", async () => {
    await expect(
      assignPatient("u1", {
        patientFhirId: "p1",
        assignedUserId: "u1",
        assignmentRole: "primary",
      }),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("successfully assigns patient when user is practitioner and no active assignment exists", async () => {
    userModelMocks.User.findById.mockResolvedValue({ role: "practitioner" });
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue(null);
    assignmentRepoMocks.createAssignment.mockResolvedValue({ _id: "a1" });

    const out = await assignPatient("admin-1", {
      patientFhirId: "p1",
      assignedUserId: "u2",
      assignmentRole: "covering",
    });

    expect(assignmentRepoMocks.createAssignment).toHaveBeenCalledWith({
      patientFhirId: "p1",
      assignedUserId: "u2",
      assignmentRole: "covering",
      assignedByUserId: "admin-1",
    });
    expect(out).toEqual({ _id: "a1" });
  });

  it("rejects duplicate active assignment", async () => {
    userModelMocks.User.findById.mockResolvedValue({ role: "practitioner" });
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({ _id: "existing" });

    await expect(
      assignPatient("admin-1", {
        patientFhirId: "p1",
        assignedUserId: "u2",
        assignmentRole: "covering",
      }),
    ).rejects.toMatchObject<AppError>({ statusCode: 409 });
  });

  it("removeAssignment validates existence and active flag", async () => {
    assignmentRepoMocks.getAssignmentById.mockResolvedValueOnce(null);
    await expect(removeAssignment("a1")).rejects.toMatchObject<AppError>({
      statusCode: 404,
    });

    assignmentRepoMocks.getAssignmentById.mockResolvedValueOnce({ active: false });
    await expect(removeAssignment("a1")).rejects.toMatchObject<AppError>({
      statusCode: 400,
    });

    assignmentRepoMocks.getAssignmentById.mockResolvedValueOnce({ active: true });
    assignmentRepoMocks.deactivateAssignment.mockResolvedValue({ _id: "a1", active: false });
    await expect(removeAssignment("a1")).resolves.toEqual({ _id: "a1", active: false });
  });

  it("delegates assignment list lookups", async () => {
    assignmentRepoMocks.getAssignmentsByPatient.mockResolvedValue([{ _id: "a1" }]);
    assignmentRepoMocks.getAssignmentsByUser.mockResolvedValue([{ _id: "a2" }]);

    await expect(getPatientAssignments("p1")).resolves.toEqual([{ _id: "a1" }]);
    await expect(getUserAssignments("u1")).resolves.toEqual([{ _id: "a2" }]);
  });

  it("returns practitioner summaries", async () => {
    const practitioners = [{ _id: "u1", name: "Dr", email: "d@example.com" }];
    const lean = vi.fn().mockResolvedValue(practitioners);
    userModelMocks.User.find.mockReturnValue({ lean });

    const out = await getPractitioners();
    expect(userModelMocks.User.find).toHaveBeenCalledWith(
      { role: "practitioner" },
      { _id: 1, name: 1, email: 1, image: 1 },
    );
    expect(lean).toHaveBeenCalled();
    expect(out).toEqual(practitioners);
  });
});
