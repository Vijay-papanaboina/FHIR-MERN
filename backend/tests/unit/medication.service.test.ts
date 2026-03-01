import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/AppError.js";

const assignmentRepoMocks = vi.hoisted(() => ({
  findActiveAssignment: vi.fn(),
  getAssignmentsByPatient: vi.fn(),
}));

const medicationRepoMocks = vi.hoisted(() => ({
  createMedicationRequest: vi.fn(),
  getMedicationRequestById: vi.fn(),
  getMedicationRequestsByPatient: vi.fn(),
  updateMedicationRequestStatus: vi.fn(),
}));

const alertModelMocks = vi.hoisted(() => ({
  Alert: {
    create: vi.fn(),
  },
}));

const sseManagerMocks = vi.hoisted(() => ({
  sendToUsers: vi.fn(),
}));

vi.mock(
  "../../src/repositories/assignment.repository.js",
  () => assignmentRepoMocks,
);
vi.mock(
  "../../src/repositories/medication-request.repository.js",
  () => medicationRepoMocks,
);
vi.mock("../../src/models/alert.model.js", () => alertModelMocks);
vi.mock("../../src/services/sse.manager.js", () => sseManagerMocks);

import {
  changeMedicationStatus,
  listPatientMedicationRequests,
  prescribeMedication,
} from "../../src/services/medication.service.js";

describe("medication.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unassigned practitioner access", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue(null);

    await expect(
      listPatientMedicationRequests(
        { userId: "u-pract", role: "practitioner" },
        "patient-1",
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("blocks consulting practitioner from prescribing", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "consulting",
    });

    await expect(
      prescribeMedication(
        { userId: "u-pract", role: "practitioner", name: "Dr C" },
        "patient-1",
        {
          drugName: "Metformin 500mg",
          dosageInstructions: "Take one tablet by mouth",
          frequency: "Twice daily",
          startDate: "2026-03-01",
        },
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("allows primary practitioner to prescribe", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "primary",
    });
    medicationRepoMocks.createMedicationRequest.mockResolvedValue({
      id: "med-1",
      status: "active",
      authoredOn: "2026-03-01T00:00:00.000Z",
      subject: { reference: "Patient/patient-1" },
    });
    assignmentRepoMocks.getAssignmentsByPatient.mockResolvedValue([]);

    const out = await prescribeMedication(
      { userId: "u-pract", role: "practitioner", name: "Dr P" },
      "patient-1",
      {
        drugName: "Lisinopril 10mg",
        rxNormCode: "12345",
        dosageInstructions: "Take one tablet by mouth",
        frequency: "Daily",
        startDate: "2026-03-01",
      },
    );

    expect(medicationRepoMocks.createMedicationRequest).toHaveBeenCalledWith(
      "patient-1",
      {
        drugName: "Lisinopril 10mg",
        rxNormCode: "12345",
        dosageInstructions: "Take one tablet by mouth",
        frequency: "Daily",
        startDate: "2026-03-01",
        requesterDisplay: "Dr P",
      },
    );
    expect(out).toEqual(
      expect.objectContaining({
        id: "med-1",
        status: "active",
      }),
    );
  });

  it("allows admin bypass for write operations", async () => {
    medicationRepoMocks.getMedicationRequestById.mockResolvedValue({
      id: "med-1",
      status: "active",
      subject: { reference: "Patient/patient-1" },
    });
    medicationRepoMocks.updateMedicationRequestStatus.mockResolvedValue({
      id: "med-1",
      status: "completed",
      subject: { reference: "Patient/patient-1" },
    });

    const out = await changeMedicationStatus(
      { userId: "u-admin", role: "admin" },
      "patient-1",
      "med-1",
      "completed",
    );

    expect(assignmentRepoMocks.findActiveAssignment).not.toHaveBeenCalled();
    expect(
      medicationRepoMocks.updateMedicationRequestStatus,
    ).toHaveBeenCalledWith("med-1", "completed", "active");
    expect(out).toEqual(expect.objectContaining({ status: "completed" }));
  });

  it("rejects invalid status transitions from non-active states", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "covering",
    });
    medicationRepoMocks.getMedicationRequestById.mockResolvedValue({
      id: "med-2",
      status: "stopped",
      subject: { reference: "Patient/patient-1" },
    });

    await expect(
      changeMedicationStatus(
        { userId: "u-pract", role: "practitioner" },
        "patient-1",
        "med-2",
        "completed",
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 400 });
  });
});
