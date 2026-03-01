import { fhirBaseUrl, fhirGet, fhirPost, fhirPut } from "./fhir.client.js";

export type MedicationRequestStatus =
  | "active"
  | "on-hold"
  | "cancelled"
  | "completed"
  | "entered-in-error"
  | "stopped"
  | "draft"
  | "unknown";

export type MedicationRequestIntent =
  | "proposal"
  | "plan"
  | "order"
  | "original-order"
  | "reflex-order"
  | "filler-order"
  | "instance-order"
  | "option";

export interface CreateMedicationRequestInput {
  drugName: string;
  rxNormCode?: string;
  status?: MedicationRequestStatus;
  intent?: MedicationRequestIntent;
}

const buildMedicationCodeableConcept = (
  input: CreateMedicationRequestInput,
): Record<string, unknown> => {
  const text = input.drugName.trim();
  const rxNormCode = input.rxNormCode?.trim();

  const concept: Record<string, unknown> = { text };

  if (rxNormCode) {
    concept["coding"] = [
      {
        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
        code: rxNormCode,
      },
    ];
  }

  return concept;
};

const buildMedicationRequestResource = (
  patientFhirId: string,
  practitionerFhirId: string,
  input: CreateMedicationRequestInput,
): Record<string, unknown> => ({
  resourceType: "MedicationRequest",
  status: input.status ?? "active",
  intent: input.intent ?? "order",
  subject: {
    reference: `Patient/${patientFhirId}`,
  },
  requester: {
    reference: `Practitioner/${practitionerFhirId}`,
  },
  medicationCodeableConcept: buildMedicationCodeableConcept(input),
});

export const createMedicationRequest = async (
  patientFhirId: string,
  practitionerFhirId: string,
  data: CreateMedicationRequestInput,
): Promise<Record<string, unknown>> => {
  const resource = buildMedicationRequestResource(
    patientFhirId.trim(),
    practitionerFhirId.trim(),
    data,
  );
  return fhirPost(`${fhirBaseUrl()}/MedicationRequest`, resource);
};

export const getMedicationRequestById = async (
  id: string,
): Promise<Record<string, unknown>> =>
  fhirGet(
    `${fhirBaseUrl()}/MedicationRequest/${encodeURIComponent(id.trim())}`,
  );

export const getMedicationRequestsByPatient = async (
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const query = new URLSearchParams({
    subject: `Patient/${patientFhirId.trim()}`,
    _sort: "-authoredon",
  });

  query.append("status", "active");
  query.append("status", "completed");
  query.append("status", "stopped");

  return fhirGet(`${fhirBaseUrl()}/MedicationRequest?${query.toString()}`);
};

export const updateMedicationRequestStatus = async (
  id: string,
  status: MedicationRequestStatus,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  const existing = await getMedicationRequestById(trimmedId);
  const updated: Record<string, unknown> = {
    ...existing,
    status,
  };

  return fhirPut(
    `${fhirBaseUrl()}/MedicationRequest/${encodeURIComponent(trimmedId)}`,
    updated,
  );
};
