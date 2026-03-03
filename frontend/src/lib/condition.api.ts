import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  ConditionDTO,
  ConditionStatus,
  CreateConditionInput,
  UpdatableConditionStatus,
} from "@fhir-mern/shared";

export type {
  ConditionDTO,
  ConditionStatus,
  CreateConditionInput,
  UpdatableConditionStatus,
} from "@fhir-mern/shared";

interface FhirBundleEntry {
  resource?: unknown;
}

interface FhirBundle {
  resourceType?: string;
  entry?: FhirBundleEntry[];
}

interface FhirCoding {
  code?: unknown;
}

interface FhirCodeableConcept {
  text?: unknown;
  coding?: FhirCoding[];
}

interface FhirReference {
  reference?: unknown;
  display?: unknown;
}

interface FhirAnnotation {
  text?: unknown;
}

interface ConditionResource {
  id?: unknown;
  resourceType?: unknown;
  code?: FhirCodeableConcept;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  recordedDate?: unknown;
  recorder?: FhirReference;
  note?: FhirAnnotation[];
}

const CONDITION_BASE_PATH = "/api/patients";

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getConceptCode(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const concept = value as FhirCodeableConcept;
  const codingCode = asStringOrNull(concept.coding?.[0]?.code);
  if (codingCode) return codingCode;
  return asStringOrNull(concept.text);
}

function asConditionStatus(resource: ConditionResource): ConditionStatus {
  const verificationCode = getConceptCode(resource.verificationStatus);
  if (verificationCode === "entered-in-error") return "entered-in-error";

  const clinicalCode = getConceptCode(resource.clinicalStatus);
  if (
    clinicalCode === "active" ||
    clinicalCode === "inactive" ||
    clinicalCode === "resolved"
  ) {
    return clinicalCode;
  }
  return "unknown";
}

function extractRecorder(reference?: FhirReference): string | null {
  const display = asStringOrNull(reference?.display);
  if (display) return display;
  const ref = asStringOrNull(reference?.reference);
  if (!ref) return null;
  const recorderId = ref.split("/")[1];
  return recorderId ? recorderId : ref;
}

export function mapConditionResource(
  resource: ConditionResource,
): ConditionDTO | null {
  const id = asStringOrNull(resource.id);
  if (!id) {
    console.warn("Skipping Condition without id");
    return null;
  }

  return {
    id,
    diagnosis: asStringOrNull(resource.code?.text) ?? "Unnamed condition",
    snomedCode: asStringOrNull(resource.code?.coding?.[0]?.code),
    status: asConditionStatus(resource),
    recordedDate: asStringOrNull(resource.recordedDate),
    recorder: extractRecorder(resource.recorder),
    note: asStringOrNull(resource.note?.[0]?.text),
  };
}

export function mapConditionBundle(bundle: unknown): ConditionDTO[] {
  if (!bundle || typeof bundle !== "object") return [];

  const typedBundle = bundle as FhirBundle;
  const entries = Array.isArray(typedBundle.entry) ? typedBundle.entry : [];

  return entries
    .map((entry) => entry.resource)
    .filter(
      (resource): resource is ConditionResource =>
        !!resource &&
        typeof resource === "object" &&
        (resource as { resourceType?: unknown }).resourceType === "Condition",
    )
    .map((resource) => mapConditionResource(resource))
    .filter((resource): resource is ConditionDTO => !!resource);
}

export async function fetchPatientConditions(
  patientFhirId: string,
): Promise<ConditionDTO[]> {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  const data = await apiGet<unknown>(
    `${CONDITION_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/conditions`,
  );
  return mapConditionBundle(data);
}

export async function createPatientCondition(
  patientFhirId: string,
  input: CreateConditionInput,
): Promise<ConditionDTO> {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  const diagnosis = input.diagnosis?.trim() ?? "";
  const recordedDate = input.recordedDate?.trim() ?? "";
  if (!diagnosis) {
    return Promise.reject(new Error("diagnosis is required"));
  }
  if (!recordedDate) {
    return Promise.reject(new Error("recordedDate is required"));
  }

  const payload = {
    diagnosis,
    recordedDate,
    ...(input.snomedCode?.trim()
      ? { snomedCode: input.snomedCode.trim() }
      : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  };

  const data = await apiPost<ConditionResource>(
    `${CONDITION_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/conditions`,
    payload,
  );
  const mapped = mapConditionResource(data);
  if (!mapped) {
    return Promise.reject(new Error("Condition response missing required id"));
  }
  return mapped;
}

export async function updatePatientConditionStatus(
  patientFhirId: string,
  conditionId: string,
  status: UpdatableConditionStatus,
): Promise<ConditionDTO> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedConditionId = conditionId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  if (!trimmedConditionId) {
    return Promise.reject(new Error("Condition ID is required"));
  }
  const data = await apiPatch<ConditionResource>(
    `${CONDITION_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/conditions/${encodeURIComponent(trimmedConditionId)}`,
    { status },
  );
  const mapped = mapConditionResource(data);
  if (!mapped) {
    return Promise.reject(new Error("Condition response missing required id"));
  }
  return mapped;
}

export async function deletePatientCondition(
  patientFhirId: string,
  conditionId: string,
): Promise<{ id: string; deleted: boolean }> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedConditionId = conditionId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  if (!trimmedConditionId) {
    return Promise.reject(new Error("Condition ID is required"));
  }
  return apiDelete<{ id: string; deleted: boolean }>(
    `${CONDITION_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/conditions/${encodeURIComponent(trimmedConditionId)}`,
  );
}
