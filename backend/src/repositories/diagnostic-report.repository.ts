import { AppError } from "../utils/AppError.js";
import { fhirBaseUrl, fhirGet } from "./fhir.client.js";
import type { DiagnosticReportStatus } from "@fhir-mern/shared";

const DIAGNOSTIC_REPORT_STATUS_VALUES = new Set<DiagnosticReportStatus>([
  "registered",
  "partial",
  "preliminary",
  "final",
  "amended",
  "corrected",
  "appended",
  "cancelled",
  "entered-in-error",
  "unknown",
]);

export interface DiagnosticReportSearchOptions {
  statuses?: DiagnosticReportStatus[];
}

export const getDiagnosticReportStatus = (
  resource: Record<string, unknown>,
): DiagnosticReportStatus => {
  const statusValue = resource["status"];
  if (typeof statusValue !== "string") return "unknown";
  return DIAGNOSTIC_REPORT_STATUS_VALUES.has(
    statusValue as DiagnosticReportStatus,
  )
    ? (statusValue as DiagnosticReportStatus)
    : "unknown";
};

export const extractReportPatientId = (
  resource: Record<string, unknown>,
): string | null => {
  const subjectValue = resource["subject"];
  const subjectReference =
    subjectValue && typeof subjectValue === "object"
      ? (subjectValue as { reference?: unknown }).reference
      : undefined;
  if (typeof subjectReference !== "string") return null;

  const [resourceType, id] = subjectReference.split("/");
  if (resourceType !== "Patient" || !id) return null;
  return id;
};

export const getDiagnosticReportsByPatient = async (
  patientFhirId: string,
  options: DiagnosticReportSearchOptions = {},
): Promise<Record<string, unknown>> => {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    throw new AppError("patientFhirId is required", 400);
  }

  const query = new URLSearchParams({
    subject: `Patient/${trimmedPatientId}`,
    _sort: "-_lastUpdated",
  });

  const statuses = Array.from(
    new Set(
      (options.statuses ?? []).filter((status) => status.trim().length > 0),
    ),
  );
  if (statuses.length > 0) {
    query.set("status", statuses.join(","));
  }

  return fhirGet(`${fhirBaseUrl()}/DiagnosticReport?${query.toString()}`);
};

export const getDiagnosticReportById = async (
  id: string,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("diagnosticReportId is required", 400);
  }

  return fhirGet(
    `${fhirBaseUrl()}/DiagnosticReport/${encodeURIComponent(trimmedId)}`,
  );
};
