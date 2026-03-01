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
  dosageInstructions: string;
  frequency: string;
  startDate: string;
  requesterDisplay?: string;
  requesterReference?: string;
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
  input: CreateMedicationRequestInput,
): Record<string, unknown> => {
  const authoredOn = new Date(input.startDate);
  const normalizedAuthoredOn = Number.isNaN(authoredOn.getTime())
    ? new Date().toISOString()
    : authoredOn.toISOString();
  const requesterReference = input.requesterReference?.trim();
  const requesterDisplay = input.requesterDisplay?.trim();
  const requester =
    requesterReference || requesterDisplay
      ? {
          ...(requesterReference ? { reference: requesterReference } : {}),
          ...(requesterDisplay ? { display: requesterDisplay } : {}),
        }
      : undefined;

  return {
    resourceType: "MedicationRequest",
    status: input.status ?? "active",
    intent: input.intent ?? "order",
    authoredOn: normalizedAuthoredOn,
    subject: {
      reference: `Patient/${patientFhirId}`,
    },
    ...(requester ? { requester } : {}),
    medicationCodeableConcept: buildMedicationCodeableConcept(input),
    dosageInstruction: [
      {
        text: `${input.dosageInstructions.trim()} | Frequency: ${input.frequency.trim()}`,
      },
    ],
  };
};

export const createMedicationRequest = async (
  patientFhirId: string,
  data: CreateMedicationRequestInput,
): Promise<Record<string, unknown>> => {
  const resource = buildMedicationRequestResource(patientFhirId.trim(), data);
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
  const normalizedPatientId = patientFhirId.trim();
  const query = new URLSearchParams({
    patient: `Patient/${normalizedPatientId}`,
    status: "active,completed,stopped",
    _sort: "-authoredon",
  });

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
