import { AppError } from "../utils/AppError.js";
import { fhirBaseUrl, fhirGet } from "./fhir.client.js";

export const getDiagnosticObservationById = async (
  id: string | null | undefined,
): Promise<Record<string, unknown>> => {
  if (id == null) {
    throw new AppError("observationId is required", 400);
  }

  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("observationId is required", 400);
  }

  return fhirGet(
    `${fhirBaseUrl()}/Observation/${encodeURIComponent(trimmedId)}`,
  );
};

export const getDiagnosticObservationsByIds = async (
  ids: string[],
): Promise<Record<string, unknown>[]> => {
  const normalizedIds = ids
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (normalizedIds.length === 0) return [];

  const resources = await Promise.all(
    normalizedIds.map((id) => getDiagnosticObservationById(id)),
  );
  return resources;
};

export const extractObservationPatientId = (
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

export const extractObservationDisplay = (
  resource: Record<string, unknown>,
): string => {
  const codeValue = resource["code"];
  const codeText =
    codeValue && typeof codeValue === "object"
      ? (codeValue as { text?: unknown }).text
      : undefined;
  if (typeof codeText === "string" && codeText.trim().length > 0) {
    return codeText.trim();
  }

  const coding =
    codeValue && typeof codeValue === "object"
      ? (codeValue as { coding?: Array<{ display?: unknown; code?: unknown }> })
          .coding
      : undefined;
  const firstDisplay = coding?.[0]?.display;
  if (typeof firstDisplay === "string" && firstDisplay.trim().length > 0) {
    return firstDisplay.trim();
  }

  const firstCode = coding?.[0]?.code;
  if (typeof firstCode === "string" && firstCode.trim().length > 0) {
    return firstCode.trim();
  }

  return "Diagnostic observation";
};
