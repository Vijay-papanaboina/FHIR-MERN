import {
  fhirBaseUrl,
  fhirGet,
  fhirPost,
  fhirPutWithHeaders,
} from "./fhir.client.js";
import { AppError } from "../utils/AppError.js";
import type {
  CreateMedicationInput,
  MedicationStatus as MedicationRequestStatus,
} from "@fhir-mern/shared";
export type { MedicationRequestStatus };

export type MedicationRequestIntent =
  | "proposal"
  | "plan"
  | "order"
  | "original-order"
  | "reflex-order"
  | "filler-order"
  | "instance-order"
  | "option";

export interface CreateMedicationRequestInput extends CreateMedicationInput {
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
  if (Number.isNaN(authoredOn.getTime())) {
    throw new AppError("Invalid startDate provided for MedicationRequest", 400);
  }
  const normalizedAuthoredOn = authoredOn.toISOString();
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
  expectedCurrentStatus?: MedicationRequestStatus,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  const existing = await getMedicationRequestById(trimmedId);
  const currentStatus = existing["status"];
  if (
    expectedCurrentStatus &&
    typeof currentStatus === "string" &&
    currentStatus !== expectedCurrentStatus
  ) {
    throw new AppError(
      `MedicationRequest status changed before update: expected ${expectedCurrentStatus}, got ${currentStatus}`,
      409,
    );
  }
  const meta = existing["meta"];
  const versionId =
    meta && typeof meta === "object"
      ? (meta as { versionId?: unknown }).versionId
      : undefined;
  if (typeof versionId !== "string" || versionId.trim().length === 0) {
    throw new AppError(
      "Cannot update MedicationRequest without meta.versionId for optimistic locking",
      502,
    );
  }

  const updated: Record<string, unknown> = {
    ...existing,
    status,
  };

  return fhirPutWithHeaders(
    `${fhirBaseUrl()}/MedicationRequest/${encodeURIComponent(trimmedId)}`,
    updated,
    { "If-Match": `W/"${versionId.trim()}"` },
  );
};
