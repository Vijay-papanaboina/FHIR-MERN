import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/AppError.js";

const assignmentRepoMocks = vi.hoisted(() => ({
  findActiveAssignment: vi.fn(),
}));

const diagnosticReportRepoMocks = vi.hoisted(() => ({
  getDiagnosticReportById: vi.fn(),
  getDiagnosticReportsByPatient: vi.fn(),
  extractReportPatientId: vi.fn(),
}));

const diagnosticObservationRepoMocks = vi.hoisted(() => ({
  getDiagnosticObservationsByIds: vi.fn(),
  extractObservationPatientId: vi.fn(),
}));

vi.mock(
  "../../src/repositories/assignment.repository.js",
  () => assignmentRepoMocks,
);
vi.mock(
  "../../src/repositories/diagnostic-report.repository.js",
  () => diagnosticReportRepoMocks,
);
vi.mock(
  "../../src/repositories/diagnostic-observation.repository.js",
  () => diagnosticObservationRepoMocks,
);

import {
  getPatientDiagnostic,
  listPatientDiagnosticResults,
  listPatientDiagnostics,
  listPortalDiagnostics,
} from "../../src/services/diagnostics.service.js";

describe("diagnostics.service", () => {
  const patientFhirId = "patient-1";

  beforeEach(() => {
    vi.clearAllMocks();
    diagnosticReportRepoMocks.extractReportPatientId.mockImplementation(
      (resource: Record<string, unknown>) =>
        (
          (resource.subject as { reference?: string } | undefined)?.reference ??
          ""
        )
          .replace("Patient/", "")
          .trim() || null,
    );
    diagnosticObservationRepoMocks.extractObservationPatientId.mockImplementation(
      (resource: Record<string, unknown>) =>
        (
          (resource.subject as { reference?: string } | undefined)?.reference ??
          ""
        )
          .replace("Patient/", "")
          .trim() || null,
    );
  });

  it("rejects unassigned practitioner read access", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue(null);

    await expect(
      listPatientDiagnostics(
        { userId: "u-pract", role: "practitioner" },
        patientFhirId,
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("allows assigned practitioner diagnostics list access", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "consulting",
    });
    diagnosticReportRepoMocks.getDiagnosticReportsByPatient.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });

    const out = await listPatientDiagnostics(
      { userId: "u-pract", role: "practitioner" },
      patientFhirId,
    );

    expect(
      diagnosticReportRepoMocks.getDiagnosticReportsByPatient,
    ).toHaveBeenCalledWith(patientFhirId);
    expect(out).toEqual(
      expect.objectContaining({
        resourceType: "Bundle",
      }),
    );
  });

  it("rejects reading report that belongs to another patient", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "primary",
    });
    diagnosticReportRepoMocks.getDiagnosticReportById.mockResolvedValue({
      id: "report-1",
      subject: { reference: "Patient/patient-2" },
    });

    await expect(
      getPatientDiagnostic(
        { userId: "u-pract", role: "practitioner" },
        patientFhirId,
        "report-1",
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 404 });
  });

  it("returns linked diagnostic observations for owned report", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "covering",
    });
    diagnosticReportRepoMocks.getDiagnosticReportById.mockResolvedValue({
      id: "report-1",
      subject: { reference: `Patient/${patientFhirId}` },
      result: [{ reference: "Observation/obs-1" }],
    });
    diagnosticObservationRepoMocks.getDiagnosticObservationsByIds.mockResolvedValue(
      [
        {
          id: "obs-1",
          subject: { reference: `Patient/${patientFhirId}` },
        },
      ],
    );

    const out = await listPatientDiagnosticResults(
      { userId: "u-pract", role: "practitioner" },
      patientFhirId,
      "report-1",
    );

    expect(
      diagnosticObservationRepoMocks.getDiagnosticObservationsByIds,
    ).toHaveBeenCalledWith(["obs-1"]);
    expect(out).toEqual(
      expect.objectContaining({
        resourceType: "Bundle",
        total: 1,
      }),
    );
  });

  it("filters portal diagnostics to finalized statuses", async () => {
    diagnosticReportRepoMocks.getDiagnosticReportsByPatient.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });

    await listPortalDiagnostics(patientFhirId);

    expect(
      diagnosticReportRepoMocks.getDiagnosticReportsByPatient,
    ).toHaveBeenCalledWith(patientFhirId, {
      statuses: ["final", "amended", "corrected"],
    });
  });
});
