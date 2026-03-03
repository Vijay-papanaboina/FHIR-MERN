import { subjectPatientId } from "./seed-fhir.util.js";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const sanitizeConditionResource = (
  resource: Record<string, unknown>,
): Record<string, unknown> | null => {
  const id = asString(resource["id"]);
  const subject = asRecord(resource["subject"]);
  const subjectRefRaw = asString(subject?.["reference"]);
  const patientId = subjectPatientId(subjectRefRaw ?? undefined);
  const code = asRecord(resource["code"]);

  if (!id || !patientId || !code) return null;

  return {
    resourceType: "Condition",
    id,
    clinicalStatus: asRecord(resource["clinicalStatus"]) ?? {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
        },
      ],
    },
    verificationStatus: asRecord(resource["verificationStatus"]) ?? {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "confirmed",
        },
      ],
    },
    code,
    subject: { reference: `Patient/${patientId}` },
    recordedDate:
      asString(resource["recordedDate"]) ??
      asString(resource["onsetDateTime"]) ??
      new Date().toISOString(),
    ...(asString(resource["onsetDateTime"])
      ? { onsetDateTime: asString(resource["onsetDateTime"]) }
      : {}),
    ...(Array.isArray(resource["note"]) ? { note: resource["note"] } : {}),
  };
};
