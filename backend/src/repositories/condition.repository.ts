import {
  fhirBaseUrl,
  fhirDelete,
  fhirGet,
  fhirPost,
  fhirPutWithHeaders,
} from "./fhir.client.js";
import { AppError } from "../utils/AppError.js";
import type { ConditionStatus, CreateConditionInput } from "@fhir-mern/shared";

export type { ConditionStatus, CreateConditionInput };

type ConditionClinicalStatus = NonNullable<
  CreateConditionInput["clinicalStatus"]
>;
export type ConditionVerificationStatus = "confirmed" | "entered-in-error";

const CONDITION_CLINICAL_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/condition-clinical";
const CONDITION_VERIFICATION_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/condition-ver-status";
const SNOMED_SYSTEM = "http://snomed.info/sct";

const getVersionId = (resource: Record<string, unknown>): string => {
  const meta = resource["meta"];
  const versionId =
    meta && typeof meta === "object"
      ? (meta as { versionId?: unknown }).versionId
      : undefined;

  if (typeof versionId !== "string" || versionId.trim().length === 0) {
    throw new AppError(
      "Cannot update Condition without meta.versionId for optimistic locking",
      502,
    );
  }

  return versionId.trim();
};

const normalizeDateTime = (value: string, fieldName: string): string => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw new AppError(`Invalid ${fieldName} provided for Condition`, 400);
  }
  return dt.toISOString();
};

const normalizeClinicalStatus = (
  status: string | undefined,
): ConditionClinicalStatus => {
  if (status === "inactive" || status === "resolved") return status;
  return "active";
};

const buildClinicalStatusConcept = (
  status: ConditionClinicalStatus,
): Record<string, unknown> => ({
  coding: [
    {
      system: CONDITION_CLINICAL_SYSTEM,
      code: status,
      display: status,
    },
  ],
  text: status,
});

const buildVerificationStatusConcept = (
  status: ConditionVerificationStatus,
): Record<string, unknown> => ({
  coding: [
    {
      system: CONDITION_VERIFICATION_SYSTEM,
      code: status,
      display: status,
    },
  ],
  text: status,
});

const buildConditionResource = (
  patientFhirId: string,
  practitionerFhirId: string | undefined,
  input: CreateConditionInput,
): Record<string, unknown> => {
  const patientId = patientFhirId.trim();
  if (!patientId) {
    throw new AppError("patientFhirId is required for Condition", 400);
  }
  const diagnosis = input.diagnosis.trim();
  if (!diagnosis) {
    throw new AppError("diagnosis is required for Condition", 400);
  }
  const recordedDate = normalizeDateTime(input.recordedDate, "recordedDate");
  const snomedCode = input.snomedCode?.trim();
  const note = input.note?.trim();
  const clinicalStatus = normalizeClinicalStatus(input.clinicalStatus);

  return {
    resourceType: "Condition",
    clinicalStatus: buildClinicalStatusConcept(clinicalStatus),
    verificationStatus: buildVerificationStatusConcept("confirmed"),
    code: {
      text: diagnosis,
      ...(snomedCode
        ? {
            coding: [{ system: SNOMED_SYSTEM, code: snomedCode }],
          }
        : {}),
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    ...(practitionerFhirId?.trim()
      ? {
          recorder: {
            reference: `Practitioner/${practitionerFhirId.trim()}`,
          },
        }
      : {}),
    recordedDate,
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

export const getConditionStatus = (
  resource: Record<string, unknown>,
): ConditionStatus => {
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

export const createCondition = async (
  patientFhirId: string,
  practitionerFhirId: string | undefined,
  data: CreateConditionInput,
): Promise<Record<string, unknown>> => {
  const resource = buildConditionResource(
    patientFhirId,
    practitionerFhirId,
    data,
  );
  return fhirPost(`${fhirBaseUrl()}/Condition`, resource);
};

export const getConditionById = async (
  id: string,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("conditionId is required", 400);
  }
  return fhirGet(`${fhirBaseUrl()}/Condition/${encodeURIComponent(trimmedId)}`);
};

export const getConditionsByPatient = async (
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
  return fhirGet(`${fhirBaseUrl()}/Condition?${query.toString()}`);
};

export const updateConditionStatus = async (
  id: string,
  status: ConditionStatus,
  expectedCurrentStatus?: ConditionStatus,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("conditionId is required", 400);
  }

  const existing = await getConditionById(trimmedId);
  const currentStatus = getConditionStatus(existing);
  if (expectedCurrentStatus && currentStatus !== expectedCurrentStatus) {
    throw new AppError(
      `Condition status changed before update: expected ${expectedCurrentStatus}, got ${currentStatus}`,
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
    throw new AppError("Unsupported Condition status update", 400);
  }

  const versionId = getVersionId(existing);
  return fhirPutWithHeaders(
    `${fhirBaseUrl()}/Condition/${encodeURIComponent(trimmedId)}`,
    updated,
    { "If-Match": `W/"${versionId}"` },
  );
};

export const deleteCondition = async (
  id: string,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new AppError("conditionId is required", 400);
  }
  return fhirDelete(
    `${fhirBaseUrl()}/Condition/${encodeURIComponent(trimmedId)}`,
  );
};
