import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/AppError.js";

const assignmentRepoMocks = vi.hoisted(() => ({
  findActiveAssignment: vi.fn(),
}));

const conditionRepoMocks = vi.hoisted(() => ({
  createCondition: vi.fn(),
  getConditionById: vi.fn(),
  getConditionsByPatient: vi.fn(),
  updateConditionStatus: vi.fn(),
  deleteCondition: vi.fn(),
  getConditionStatus: vi.fn(),
}));

const allergyRepoMocks = vi.hoisted(() => ({
  createAllergyIntolerance: vi.fn(),
  getAllergyIntoleranceById: vi.fn(),
  getAllergiesByPatient: vi.fn(),
  updateAllergyStatus: vi.fn(),
  deleteAllergyIntolerance: vi.fn(),
  getAllergyStatus: vi.fn(),
}));

const userRepoMocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
}));

vi.mock(
  "../../src/repositories/assignment.repository.js",
  () => assignmentRepoMocks,
);
vi.mock(
  "../../src/repositories/condition.repository.js",
  () => conditionRepoMocks,
);
vi.mock(
  "../../src/repositories/allergy-intolerance.repository.js",
  () => allergyRepoMocks,
);
vi.mock("../../src/repositories/user.repository.js", () => userRepoMocks);

import {
  changePatientConditionStatus,
  createPatientAllergy,
  createPatientCondition,
  listPatientConditions,
} from "../../src/services/conditions-allergies.service.js";

describe("conditions-allergies.service", () => {
  const patientFhirId = "patient-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unassigned practitioner read access", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue(null);

    await expect(
      listPatientConditions(
        { userId: "u-pract", role: "practitioner" },
        patientFhirId,
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("blocks consulting practitioner from creating conditions", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "consulting",
    });

    await expect(
      createPatientCondition(
        { userId: "u-consult", role: "practitioner" },
        patientFhirId,
        {
          diagnosis: "Essential hypertension",
          recordedDate: "2026-03-01",
        },
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("allows primary practitioner to create conditions", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "primary",
    });
    userRepoMocks.findUserById.mockResolvedValue({
      _id: "u-primary",
      role: "practitioner",
      fhirPractitionerId: "pract-1",
    });
    conditionRepoMocks.createCondition.mockResolvedValue({
      id: "cond-1",
      subject: { reference: `Patient/${patientFhirId}` },
    });

    const out = await createPatientCondition(
      { userId: "u-primary", role: "practitioner" },
      patientFhirId,
      {
        diagnosis: "Type 2 diabetes mellitus",
        recordedDate: "2026-03-01",
      },
    );

    expect(conditionRepoMocks.createCondition).toHaveBeenCalledWith(
      patientFhirId,
      "pract-1",
      expect.objectContaining({
        diagnosis: "Type 2 diabetes mellitus",
      }),
    );
    expect(out).toEqual(expect.objectContaining({ id: "cond-1" }));
  });

  it("rejects invalid condition status transition", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "covering",
    });
    conditionRepoMocks.getConditionById.mockResolvedValue({
      id: "cond-2",
      subject: { reference: `Patient/${patientFhirId}` },
    });
    conditionRepoMocks.getConditionStatus.mockReturnValue("resolved");

    await expect(
      changePatientConditionStatus(
        { userId: "u-covering", role: "practitioner" },
        patientFhirId,
        "cond-2",
        "inactive",
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 400 });
  });

  it("allows admin bypass for allergy creation", async () => {
    allergyRepoMocks.createAllergyIntolerance.mockResolvedValue({
      id: "alg-1",
      patient: { reference: `Patient/${patientFhirId}` },
    });

    const out = await createPatientAllergy(
      { userId: "u-admin", role: "admin" },
      patientFhirId,
      {
        substance: "Penicillin",
        recordedDate: "2026-03-01",
      },
    );

    expect(assignmentRepoMocks.findActiveAssignment).not.toHaveBeenCalledWith(
      patientFhirId,
      "u-admin",
    );
    expect(allergyRepoMocks.createAllergyIntolerance).toHaveBeenCalledWith(
      patientFhirId,
      undefined,
      expect.objectContaining({ substance: "Penicillin" }),
    );
    expect(out).toEqual(expect.objectContaining({ id: "alg-1" }));
  });
});
