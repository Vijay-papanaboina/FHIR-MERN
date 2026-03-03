import { subjectPatientId } from "./seed-fhir.util.js";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const sanitizeAllergyResource = (
  resource: Record<string, unknown>,
): Record<string, unknown> | null => {
  const id = asString(resource["id"]);
  const patient = asRecord(resource["patient"]);
  const patientRefRaw = asString(patient?.["reference"]);
  const patientId = subjectPatientId(patientRefRaw ?? undefined);
  const code = asRecord(resource["code"]);
  if (!id || !patientId || !code) return null;

  return {
    resourceType: "AllergyIntolerance",
    id,
    clinicalStatus: asRecord(resource["clinicalStatus"]) ?? {
      coding: [
        {
          system:
            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
          code: "active",
        },
      ],
    },
    verificationStatus: asRecord(resource["verificationStatus"]) ?? {
      coding: [
        {
          system:
            "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
          code: "confirmed",
        },
      ],
    },
    type: asString(resource["type"]) ?? "allergy",
    category: Array.isArray(resource["category"])
      ? resource["category"]
      : ["food"],
    criticality:
      asString(resource["criticality"]) === "high" ||
      asString(resource["criticality"]) === "low" ||
      asString(resource["criticality"]) === "unable-to-assess"
        ? asString(resource["criticality"])
        : "low",
    code,
    patient: { reference: `Patient/${patientId}` },
    recordedDate:
      asString(resource["recordedDate"]) ?? new Date().toISOString(),
    ...(Array.isArray(resource["reaction"])
      ? { reaction: resource["reaction"] }
      : {}),
    ...(Array.isArray(resource["note"]) ? { note: resource["note"] } : {}),
  };
};
