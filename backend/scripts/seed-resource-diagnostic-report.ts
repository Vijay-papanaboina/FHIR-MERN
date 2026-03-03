import { referenceResourceId, subjectPatientId } from "./seed-fhir.util.js";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const sanitizeDiagnosticReportResource = (
  resource: Record<string, unknown>,
  allowedObservationIds?: Set<string>,
): Record<string, unknown> | null => {
  const id = asString(resource["id"]);
  const subject = asRecord(resource["subject"]);
  const subjectRefRaw = asString(subject?.["reference"]);
  const patientId = subjectPatientId(subjectRefRaw ?? undefined);
  const code = asRecord(resource["code"]);
  if (!id || !patientId || !code) return null;

  const resultRaw = Array.isArray(resource["result"])
    ? resource["result"]
    : ([] as unknown[]);
  const result = resultRaw
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => !!item)
    .map((item) => {
      const refRaw = asString(item["reference"]);
      const obsId = referenceResourceId(refRaw ?? undefined, "Observation");
      if (!obsId) return null;
      if (allowedObservationIds && !allowedObservationIds.has(obsId)) {
        return null;
      }
      return {
        ...(item as Record<string, unknown>),
        reference: `Observation/${obsId}`,
      };
    })
    .filter((item): item is Record<string, unknown> => !!item);

  if (result.length === 0) return null;

  return {
    resourceType: "DiagnosticReport",
    id,
    status: asString(resource["status"]) ?? "final",
    category: Array.isArray(resource["category"])
      ? resource["category"]
      : [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0074",
                code: "LAB",
                display: "Laboratory",
              },
            ],
          },
        ],
    code,
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime:
      asString(resource["effectiveDateTime"]) ??
      asString(resource["issued"]) ??
      new Date().toISOString(),
    issued: asString(resource["issued"]) ?? new Date().toISOString(),
    result,
    ...(asString(resource["conclusion"])
      ? { conclusion: asString(resource["conclusion"]) }
      : {}),
  };
};
