import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  AllergyDTO,
  AllergyStatus,
  CreateAllergyInput,
  UpdatableAllergyStatus,
} from "@fhir-mern/shared";

export type {
  AllergyDTO,
  AllergyStatus,
  CreateAllergyInput,
  UpdatableAllergyStatus,
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

interface FhirReaction {
  manifestation?: Array<{ text?: unknown }>;
}

interface AllergyResource {
  id?: unknown;
  resourceType?: unknown;
  code?: FhirCodeableConcept;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  recordedDate?: unknown;
  recorder?: FhirReference;
  note?: FhirAnnotation[];
  reaction?: FhirReaction[];
  criticality?: unknown;
}

const ALLERGY_BASE_PATH = "/api/patients";

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

function asAllergyStatus(resource: AllergyResource): AllergyStatus {
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
  return ref.split("/")[1] ?? ref;
}

export function mapAllergyResource(
  resource: AllergyResource,
): AllergyDTO | null {
  const id = asStringOrNull(resource.id);
  if (!id) {
    console.warn("Skipping AllergyIntolerance without id");
    return null;
  }

  const reactionText = asStringOrNull(
    resource.reaction?.[0]?.manifestation?.[0]?.text,
  );
  const criticalityRaw = asStringOrNull(resource.criticality);
  const criticality =
    criticalityRaw === "low" ||
    criticalityRaw === "high" ||
    criticalityRaw === "unable-to-assess"
      ? criticalityRaw
      : null;

  return {
    id,
    substance: asStringOrNull(resource.code?.text) ?? "Unnamed allergy",
    snomedCode: asStringOrNull(resource.code?.coding?.[0]?.code),
    status: asAllergyStatus(resource),
    recordedDate: asStringOrNull(resource.recordedDate),
    recorder: extractRecorder(resource.recorder),
    reaction: reactionText,
    criticality,
    note: asStringOrNull(resource.note?.[0]?.text),
  };
}

export function mapAllergyBundle(bundle: unknown): AllergyDTO[] {
  if (!bundle || typeof bundle !== "object") return [];
  const typedBundle = bundle as FhirBundle;
  const entries = Array.isArray(typedBundle.entry) ? typedBundle.entry : [];

  return entries
    .map((entry) => entry.resource)
    .filter(
      (resource): resource is AllergyResource =>
        !!resource &&
        typeof resource === "object" &&
        (resource as { resourceType?: unknown }).resourceType ===
          "AllergyIntolerance",
    )
    .map((resource) => mapAllergyResource(resource))
    .filter((resource): resource is AllergyDTO => !!resource);
}

export async function fetchPatientAllergies(
  patientFhirId: string,
): Promise<AllergyDTO[]> {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  const data = await apiGet<unknown>(
    `${ALLERGY_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/allergies`,
  );
  return mapAllergyBundle(data);
}

export async function createPatientAllergy(
  patientFhirId: string,
  input: CreateAllergyInput,
): Promise<AllergyDTO> {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  const substance = input.substance?.trim() ?? "";
  const recordedDate = input.recordedDate?.trim() ?? "";
  if (!substance) {
    return Promise.reject(new Error("substance is required"));
  }
  if (!recordedDate) {
    return Promise.reject(new Error("recordedDate is required"));
  }

  const payload = {
    substance,
    recordedDate,
    ...(input.snomedCode?.trim()
      ? { snomedCode: input.snomedCode.trim() }
      : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(input.reaction?.trim() ? { reaction: input.reaction.trim() } : {}),
    ...(input.criticality ? { criticality: input.criticality } : {}),
  };

  const data = await apiPost<AllergyResource>(
    `${ALLERGY_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/allergies`,
    payload,
  );
  const mapped = mapAllergyResource(data);
  if (!mapped) {
    return Promise.reject(
      new Error("AllergyIntolerance response missing required id"),
    );
  }
  return mapped;
}

export async function updatePatientAllergyStatus(
  patientFhirId: string,
  allergyId: string,
  status: UpdatableAllergyStatus,
): Promise<AllergyDTO> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedAllergyId = allergyId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  if (!trimmedAllergyId) {
    return Promise.reject(new Error("Allergy ID is required"));
  }
  const data = await apiPatch<AllergyResource>(
    `${ALLERGY_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/allergies/${encodeURIComponent(trimmedAllergyId)}`,
    { status },
  );
  const mapped = mapAllergyResource(data);
  if (!mapped) {
    return Promise.reject(
      new Error("AllergyIntolerance response missing required id"),
    );
  }
  return mapped;
}

export async function deletePatientAllergy(
  patientFhirId: string,
  allergyId: string,
): Promise<{ id: string; deleted: boolean }> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedAllergyId = allergyId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  if (!trimmedAllergyId) {
    return Promise.reject(new Error("Allergy ID is required"));
  }
  return apiDelete<{ id: string; deleted: boolean }>(
    `${ALLERGY_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/allergies/${encodeURIComponent(trimmedAllergyId)}`,
  );
}
