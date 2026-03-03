import { subjectPatientId } from "./seed-fhir.util.js";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const sanitizeMedicationResource = (
  resource: Record<string, unknown>,
  fallbackPractitionerId: string,
): Record<string, unknown> | null => {
  const id = asString(resource["id"]);
  const subject = asRecord(resource["subject"]);
  const subjectRefRaw = asString(subject?.["reference"]);
  const patientId = subjectPatientId(subjectRefRaw ?? undefined);
  if (!id || !patientId) return null;

  const statusRaw = asString(resource["status"]);
  const status =
    statusRaw &&
    [
      "active",
      "on-hold",
      "cancelled",
      "completed",
      "entered-in-error",
      "stopped",
      "draft",
      "unknown",
    ].includes(statusRaw)
      ? statusRaw
      : "active";

  const intent = asString(resource["intent"]) ?? "order";

  const requesterRaw = asRecord(resource["requester"]);
  const requesterRef = asString(requesterRaw?.["reference"]);
  const requester = requesterRef?.startsWith("Practitioner/")
    ? {
        reference: requesterRef,
        ...(asString(requesterRaw?.["display"])
          ? { display: asString(requesterRaw?.["display"]) }
          : {}),
      }
    : { reference: `Practitioner/${fallbackPractitionerId}` };

  let medicationCodeableConcept = asRecord(
    resource["medicationCodeableConcept"],
  );
  if (!medicationCodeableConcept) {
    const medicationReference = asRecord(resource["medicationReference"]);
    const display = asString(medicationReference?.["display"]);
    medicationCodeableConcept = { text: display ?? "Medication" };
  }

  const dosageInstruction = Array.isArray(resource["dosageInstruction"])
    ? resource["dosageInstruction"]
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => !!item)
        .map((item) => {
          const text = asString(item["text"]);
          return text ? { text } : item;
        })
    : [];

  return {
    resourceType: "MedicationRequest",
    id,
    status,
    intent,
    authoredOn: asString(resource["authoredOn"]) ?? new Date().toISOString(),
    subject: { reference: `Patient/${patientId}` },
    requester,
    medicationCodeableConcept,
    ...(dosageInstruction.length > 0 ? { dosageInstruction } : {}),
  };
};
