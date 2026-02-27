import { beforeEach, describe, expect, it, vi } from "vitest";

const assignmentRepoMocks = vi.hoisted(() => ({
  getAssignmentsByPatient: vi.fn(),
}));

const userRepoMocks = vi.hoisted(() => ({
  findPractitionersByIds: vi.fn(),
}));

const patientServiceMocks = vi.hoisted(() => ({
  getPatient: vi.fn(),
}));

const vitalsServiceMocks = vi.hoisted(() => ({
  getPatientVitals: vi.fn(),
  createPatientReportedVital: vi.fn(),
}));

vi.mock("../../src/repositories/assignment.repository.js", () => assignmentRepoMocks);
vi.mock("../../src/repositories/user.repository.js", () => userRepoMocks);
vi.mock("../../src/services/patient.service.js", () => patientServiceMocks);
vi.mock("../../src/services/vitals.service.js", () => vitalsServiceMocks);

import {
  getPortalCareTeam,
  getPortalDemographics,
  getPortalVitals,
  submitPortalVital,
} from "../../src/services/portal.service.js";

describe("portal.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns demographics via patient service", async () => {
    const dto = { id: "p1", displayName: "John Doe" };
    patientServiceMocks.getPatient.mockResolvedValue(dto);

    const out = await getPortalDemographics("p1");
    expect(patientServiceMocks.getPatient).toHaveBeenCalledWith("p1");
    expect(out).toEqual(dto);
  });

  it("builds care team preserving assignment order and role", async () => {
    assignmentRepoMocks.getAssignmentsByPatient.mockResolvedValue([
      { assignedUserId: "u2", assignmentRole: "covering" },
      { assignedUserId: "u1", assignmentRole: "primary" },
      { assignedUserId: "u3", assignmentRole: "consulting" },
    ]);

    userRepoMocks.findPractitionersByIds.mockResolvedValue([
      { _id: "u1", name: "Dr A", role: "practitioner", image: "a.png" },
      { _id: "u2", name: "Dr B", role: "practitioner" },
      { _id: "u3", name: "Not Practitioner", role: "patient" },
    ]);

    const out = await getPortalCareTeam("p1");

    expect(assignmentRepoMocks.getAssignmentsByPatient).toHaveBeenCalledWith("p1", true);
    expect(userRepoMocks.findPractitionersByIds).toHaveBeenCalledWith(["u2", "u1", "u3"]);
    expect(out).toEqual([
      { name: "Dr B", assignmentRole: "covering" },
      { name: "Dr A", assignmentRole: "primary", image: "a.png" },
    ]);
  });

  it("delegates vitals read to vitals service", async () => {
    const vitals = [{ id: "v1" }];
    vitalsServiceMocks.getPatientVitals.mockResolvedValue(vitals);

    const getOut = await getPortalVitals("p9");

    expect(vitalsServiceMocks.getPatientVitals).toHaveBeenCalledWith("p9");
    expect(getOut).toEqual(vitals);
  });

  it("delegates vitals submit to vitals service", async () => {
    const createdVital = { id: "v2" };
    vitalsServiceMocks.createPatientReportedVital.mockResolvedValue(createdVital);
    const payload = {
      code: "8867-4",
      display: "Heart rate",
      value: 75,
      unit: "beats/minute",
      unitCode: "/min",
    };

    const postOut = await submitPortalVital("p9", payload);

    expect(vitalsServiceMocks.createPatientReportedVital).toHaveBeenCalledWith(
      "p9",
      payload,
    );
    expect(postOut).toEqual(createdVital);
  });
});
