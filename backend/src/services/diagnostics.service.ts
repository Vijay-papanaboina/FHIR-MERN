import type { AssignmentRole } from "../models/assignment.model.js";
import { findActiveAssignment } from "../repositories/assignment.repository.js";
import {
  extractObservationPatientId,
  getDiagnosticObservationsByIds,
} from "../repositories/diagnostic-observation.repository.js";
import {
  extractReportPatientId,
  getDiagnosticReportById,
  getDiagnosticReportsByPatient,
} from "../repositories/diagnostic-report.repository.js";
import { fhirIdSchema } from "../validators/conditions-allergies.validator.js";
import { AppError } from "../utils/AppError.js";

export type DiagnosticsActorRole = "admin" | "practitioner";

interface DiagnosticsActor {
  userId: string;
  role: DiagnosticsActorRole;
}

const PORTAL_VISIBLE_REPORT_STATUSES = [
  "final",
  "amended",
  "corrected",
] as const;

const ensureFhirId = (value: string, label: string): string => {
  const parsed = fhirIdSchema.safeParse(String(value ?? "").trim());
  if (!parsed.success) {
    throw new AppError(`${label}: ${parsed.error.issues[0]?.message}`, 400);
  }
  return parsed.data;
};

const resolveAssignmentForPractitioner = async (
  actor: DiagnosticsActor,
  patientFhirId: string,
): Promise<AssignmentRole> => {
  const assignment = await findActiveAssignment(patientFhirId, actor.userId);
  if (!assignment) {
    throw new AppError(
      "Access denied. No active assignment found for this patient.",
      403,
    );
  }
  return assignment.assignmentRole;
};

const assertReadAccess = async (
  actor: DiagnosticsActor,
  patientFhirId: string,
): Promise<void> => {
  if (actor.role === "admin") return;
  await resolveAssignmentForPractitioner(actor, patientFhirId);
};

const assertReportOwnership = (
  report: Record<string, unknown>,
  patientFhirId: string,
): void => {
  const ownerId = extractReportPatientId(report);
  if (!ownerId || ownerId !== patientFhirId) {
    throw new AppError("DiagnosticReport not found for this patient", 404);
  }
};

const assertObservationOwnership = (
  observation: Record<string, unknown>,
  patientFhirId: string,
): void => {
  const ownerId = extractObservationPatientId(observation);
  if (!ownerId || ownerId !== patientFhirId) {
    throw new AppError("Diagnostic result not found for this patient", 404);
  }
};

const extractObservationIdsFromReport = (
  report: Record<string, unknown>,
): string[] => {
  const result = report["result"];
  if (!Array.isArray(result)) return [];

  return Array.from(
    new Set(
      result
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const reference = (item as { reference?: unknown }).reference;
          if (typeof reference !== "string") return null;
          const [resourceType, id] = reference.split("/");
          if (resourceType !== "Observation" || !id) return null;
          return id.trim();
        })
        .filter((id): id is string => !!id),
    ),
  );
};

const toObservationBundle = (
  observations: Record<string, unknown>[],
): Record<string, unknown> => ({
  resourceType: "Bundle",
  type: "searchset",
  total: observations.length,
  entry: observations.map((resource) => ({ resource })),
});

export const listPatientDiagnostics = async (
  actor: DiagnosticsActor,
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  await assertReadAccess(actor, normalizedPatientId);
  return getDiagnosticReportsByPatient(normalizedPatientId);
};

export const getPatientDiagnostic = async (
  actor: DiagnosticsActor,
  patientFhirId: string,
  diagnosticReportId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedDiagnosticReportId = ensureFhirId(
    diagnosticReportId,
    "diagnosticReportId",
  );

  await assertReadAccess(actor, normalizedPatientId);
  const report = await getDiagnosticReportById(normalizedDiagnosticReportId);
  assertReportOwnership(report, normalizedPatientId);
  return report;
};

export const listPatientDiagnosticResults = async (
  actor: DiagnosticsActor,
  patientFhirId: string,
  diagnosticReportId: string,
): Promise<Record<string, unknown>> => {
  const report = await getPatientDiagnostic(
    actor,
    patientFhirId,
    diagnosticReportId,
  );
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const observationIds = extractObservationIdsFromReport(report);
  const observations = await getDiagnosticObservationsByIds(observationIds);
  observations.forEach((observation) =>
    assertObservationOwnership(observation, normalizedPatientId),
  );
  return toObservationBundle(observations);
};

export const listPortalDiagnostics = async (
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  return getDiagnosticReportsByPatient(normalizedPatientId, {
    statuses: [...PORTAL_VISIBLE_REPORT_STATUSES],
  });
};

export const listPortalDiagnosticResults = async (
  patientFhirId: string,
  diagnosticReportId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedDiagnosticReportId = ensureFhirId(
    diagnosticReportId,
    "diagnosticReportId",
  );
  const report = await getDiagnosticReportById(normalizedDiagnosticReportId);
  assertReportOwnership(report, normalizedPatientId);
  const reportStatus =
    typeof report["status"] === "string"
      ? report["status"].trim().toLowerCase()
      : "";
  if (
    !PORTAL_VISIBLE_REPORT_STATUSES.some((status) => status === reportStatus)
  ) {
    throw new AppError("DiagnosticReport not available in patient portal", 404);
  }

  const observationIds = extractObservationIdsFromReport(report);
  const observations = await getDiagnosticObservationsByIds(observationIds);
  observations.forEach((observation) =>
    assertObservationOwnership(observation, normalizedPatientId),
  );
  return toObservationBundle(observations);
};
