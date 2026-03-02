import {
  fhirBaseUrl,
  fhirDelete,
  fhirGet,
  fhirPost,
  fhirPutWithHeaders,
} from "./fhir.client.js";
import { AppError } from "../utils/AppError.js";

export type AllergyStatus =
  | "active"
  | "inactive"
  | "resolved"
  | "entered-in-error"
  | "unknown";

export type AllergyClinicalStatus = "active" | "inactive" | "resolved";
export type AllergyVerificationStatus = "confirmed" | "entered-in-error";

export interface CreateAllergyIntoleranceInput {
  substance: string;
  snomedCode?: string;
  recordedDate: string;
  note?: string;
  reaction?: string;
  criticality?: "low" | "high" | "unable-to-assess";
  clinicalStatus?: AllergyClinicalStatus;
}

const ALLERGY_CLINICAL_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical";
const ALLERGY_VERIFICATION_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";
const SNOMED_SYSTEM = "http://snomed.info/sct";

const getVersionId = (resource: Record<string, unknown>): string => {
  const meta = resource["meta"];
  const versionId =
    meta && typeof meta === "object"
      ? (meta as { versionId?: unknown }).versionId
      : undefined;

  if (typeof versionId !== "string" || versionId.trim().length === 0) {
    throw new AppError(
      "Cannot update AllergyIntolerance without meta.versionId for optimistic locking",
      502,
    );
  }

  return versionId.trim();
};

const normalizeDateTime = (value: string, fieldName: string): string => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw new AppError(
      `Invalid ${fieldName} provided for AllergyIntolerance`,
      400,
    );
  }
  return dt.toISOString();
};

const normalizeClinicalStatus = (
  status: string | undefined,
): AllergyClinicalStatus => {
  if (status === "inactive" || status === "resolved") return status;
  return "active";
};

const buildClinicalStatusConcept = (
  status: AllergyClinicalStatus,
): Record<string, unknown> => ({
  coding: [
    {
      system: ALLERGY_CLINICAL_SYSTEM,
      code: status,
      display: status,
    },
  ],
  text: status,
});

const buildVerificationStatusConcept = (
  status: AllergyVerificationStatus,
): Record<string, unknown> => ({
  coding: [
    {
      system: ALLERGY_VERIFICATION_SYSTEM,
      code: status,
      display: status,
    },
  ],
  text: status,
});

const buildAllergyResource = (
  patientFhirId: string,
  practitionerFhirId: string | undefined,
  input: CreateAllergyIntoleranceInput,
): Record<string, unknown> => {
  const substance = input.substance.trim();
  if (!substance) {
    throw new AppError("substance is required for AllergyIntolerance", 400);
  }
  const recordedDate = normalizeDateTime(input.recordedDate, "recordedDate");
  const snomedCode = input.snomedCode?.trim();
  const note = input.note?.trim();
  const reactionText = input.reaction?.trim();
  const clinicalStatus = normalizeClinicalStatus(input.clinicalStatus);

  return {
    resourceType: "AllergyIntolerance",
    clinicalStatus: buildClinicalStatusConcept(clinicalStatus),
    verificationStatus: buildVerificationStatusConcept("confirmed"),
    code: {
      text: substance,
      ...(snomedCode
        ? {
            coding: [{ system: SNOMED_SYSTEM, code: snomedCode }],
          }
        : {}),
    },
    patient: {
      reference: `Patient/${patientFhirId.trim()}`,
    },
    ...(practitionerFhirId?.trim()
      ? {
          recorder: {
            reference: `Practitioner/${practitionerFhirId.trim()}`,
          },
        }
      : {}),
    recordedDate,
    ...(input.criticality ? { criticality: input.criticality } : {}),
    ...(reactionText
      ? {
          reaction: [
            {
              manifestation: [{ text: reactionText }],
            },
          ],
        }
      : {}),
    ...(note ? { note: [{ text: note }] } : {}),
  };
};

const getCodingCode = (conceptValue: unknown): string | null => {
  if (!conceptValue || typeof conceptValue !== "object") return null;
  const concept = conceptValue as {
    coding?: Array<{ code?: unknown }>;
    text?: unknown;
  };

  const code = concept.coding?.[0]?.code;
  if (typeof code === "string" && code.trim()) return code.trim();
  if (typeof concept.text === "string" && concept.text.trim()) {
    return concept.text.trim();
  }
  return null;
};

export const getAllergyStatus = (
  resource: Record<string, unknown>,
): AllergyStatus => {
  const verificationCode = getCodingCode(resource["verificationStatus"]);
  if (verificationCode === "entered-in-error") return "entered-in-error";

  const clinicalCode = getCodingCode(resource["clinicalStatus"]);
  if (
    clinicalCode === "active" ||
    clinicalCode === "inactive" ||
    clinicalCode === "resolved"
  ) {
    return clinicalCode;
  }

  return "unknown";
};

export const createAllergyIntolerance = async (
  patientFhirId: string,
  practitionerFhirId: string | undefined,
  data: CreateAllergyIntoleranceInput,
): Promise<Record<string, unknown>> => {
  const resource = buildAllergyResource(
    patientFhirId,
    practitionerFhirId,
    data,
  );
  return fhirPost(`${fhirBaseUrl()}/AllergyIntolerance`, resource);
};

export const getAllergyIntoleranceById = async (
  id: string,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("allergyId is required", 400);
  }
  return fhirGet(
    `${fhirBaseUrl()}/AllergyIntolerance/${encodeURIComponent(trimmedId)}`,
  );
};

export const getAllergiesByPatient = async (
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    throw new AppError("patientFhirId is required", 400);
  }
  const query = new URLSearchParams({
    patient: `Patient/${trimmedPatientId}`,
    _sort: "-_lastUpdated",
  });
  return fhirGet(`${fhirBaseUrl()}/AllergyIntolerance?${query.toString()}`);
};

export const updateAllergyStatus = async (
  id: string,
  status: AllergyStatus,
  expectedCurrentStatus?: AllergyStatus,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("allergyId is required", 400);
  }

  const existing = await getAllergyIntoleranceById(trimmedId);
  const currentStatus = getAllergyStatus(existing);
  if (expectedCurrentStatus && currentStatus !== expectedCurrentStatus) {
    throw new AppError(
      `AllergyIntolerance status changed before update: expected ${expectedCurrentStatus}, got ${currentStatus}`,
      409,
    );
  }

  const updated: Record<string, unknown> = { ...existing };
  if (status === "entered-in-error") {
    updated["verificationStatus"] =
      buildVerificationStatusConcept("entered-in-error");
  } else if (
    status === "active" ||
    status === "inactive" ||
    status === "resolved"
  ) {
    updated["clinicalStatus"] = buildClinicalStatusConcept(status);
  } else {
    throw new AppError("Unsupported AllergyIntolerance status update", 400);
  }

  const versionId = getVersionId(existing);
  return fhirPutWithHeaders(
    `${fhirBaseUrl()}/AllergyIntolerance/${encodeURIComponent(trimmedId)}`,
    updated,
    { "If-Match": `W/"${versionId}"` },
  );
};

export const deleteAllergyIntolerance = async (
  id: string,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("allergyId is required", 400);
  }
  return fhirDelete(
    `${fhirBaseUrl()}/AllergyIntolerance/${encodeURIComponent(trimmedId)}`,
  );
};
