import {
  referenceResourceId,
  subjectPatientId,
  type SeedRng,
} from "./seed-fhir.util.js";
import type {
  FhirDiagnosticReport,
  FhirObservation,
} from "./seed-fhir.synthea.js";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const isVitalObservation = (obs: FhirObservation): boolean => {
  return (
    obs.category?.some((cat) =>
      cat.coding?.some((coding) => coding.code === "vital-signs"),
    ) ?? false
  );
};

export const sanitizeObservationResource = (
  resource: Record<string, unknown>,
): Record<string, unknown> | null => {
  const id = asString(resource["id"]);
  const subject = asRecord(resource["subject"]);
  const subjectRefRaw = asString(subject?.["reference"]);
  const patientId = subjectPatientId(subjectRefRaw ?? undefined);
  if (!id || !patientId) return null;

  const cleaned: Record<string, unknown> = {
    ...resource,
    resourceType: "Observation",
    id,
    subject: {
      ...(subject ?? {}),
      reference: `Patient/${patientId}`,
    },
  };

  // Drop references to resources we don't seed (e.g., Encounter).
  delete cleaned["encounter"];
  delete cleaned["context"];

  return {
    ...cleaned,
  };
};

export const sanitizeVitalObservationResource = (
  resource: Record<string, unknown>,
): Record<string, unknown> | null => {
  const normalized = sanitizeObservationResource(resource);
  if (!normalized) return null;
  const code = asRecord(normalized["code"]);
  const valueQuantity = asRecord(normalized["valueQuantity"]);
  if (!code || !valueQuantity) return null;
  return {
    ...normalized,
    status: asString(normalized["status"]) ?? "final",
    category:
      Array.isArray(normalized["category"]) && normalized["category"].length > 0
        ? normalized["category"]
        : [
            {
              coding: [
                {
                  system:
                    "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "vital-signs",
                  display: "Vital Signs",
                },
              ],
            },
          ],
    code,
    effectiveDateTime:
      asString(normalized["effectiveDateTime"]) ??
      asString(normalized["issued"]) ??
      new Date().toISOString(),
    valueQuantity,
  };
};

export const collectDiagnosticResultObservationIds = (
  reports: FhirDiagnosticReport[],
): Set<string> => {
  const ids = new Set<string>();
  for (const report of reports) {
    for (const item of report.result ?? []) {
      const id = referenceResourceId(item.reference, "Observation");
      if (id) ids.add(id);
    }
  }
  return ids;
};

export const sampleDiagnosticObservationIds = (
  ids: string[],
  maxPerPatient: (rng: SeedRng) => number,
  getPatientIdForObservationId: (id: string) => string | null,
  makeRng: (seed: string) => SeedRng,
  seedPrefix: string,
): Set<string> => {
  const grouped = new Map<string, string[]>();
  for (const id of ids) {
    const patientId = getPatientIdForObservationId(id);
    if (!patientId) continue;
    const list = grouped.get(patientId) ?? [];
    list.push(id);
    grouped.set(patientId, list);
  }

  const selected = new Set<string>();
  for (const [patientId, list] of grouped.entries()) {
    const rng = makeRng(`${seedPrefix}:${patientId}`);
    const target = Math.min(list.length, maxPerPatient(rng));
    for (let i = list.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [list[i], list[j]] = [list[j] as string, list[i] as string];
    }
    for (const id of list.slice(0, target)) selected.add(id);
  }
  return selected;
};
