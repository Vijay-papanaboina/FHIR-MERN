import { apiGet, apiPatch, apiPost } from "@/lib/api";

export type MedicationStatus =
  | "active"
  | "on-hold"
  | "cancelled"
  | "completed"
  | "entered-in-error"
  | "stopped"
  | "draft"
  | "unknown";

export type UpdatableMedicationStatus = "completed" | "stopped";

export interface MedicationDTO {
  readonly id: string;
  readonly drugName: string;
  readonly rxNormCode: string | null;
  readonly dosageInstructions: string | null;
  readonly frequency: string | null;
  readonly prescriber: string | null;
  readonly prescriberReference: string | null;
  readonly startDate: string | null;
  readonly status: MedicationStatus;
}

export interface CreateMedicationInput {
  drugName: string;
  rxNormCode?: string;
  dosageInstructions: string;
  frequency: string;
  startDate: string;
}

interface FhirBundleEntry {
  resource?: unknown;
}

interface FhirBundle {
  resourceType?: string;
  entry?: FhirBundleEntry[];
}

interface MedicationCoding {
  code?: unknown;
}

interface MedicationCodeableConcept {
  text?: unknown;
  coding?: MedicationCoding[];
}

interface MedicationRequester {
  display?: unknown;
  reference?: unknown;
}

interface MedicationDosageInstruction {
  text?: unknown;
}

interface MedicationRequestResource {
  id?: unknown;
  status?: unknown;
  authoredOn?: unknown;
  requester?: MedicationRequester;
  dosageInstruction?: MedicationDosageInstruction[];
  medicationCodeableConcept?: MedicationCodeableConcept;
  extension?: unknown;
}

const MEDICATION_BASE_PATH = "/api/patients";

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asMedicationStatus(value: unknown): MedicationStatus {
  if (typeof value !== "string") return "unknown";

  switch (value) {
    case "active":
    case "on-hold":
    case "cancelled":
    case "completed":
    case "entered-in-error":
    case "stopped":
    case "draft":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function extractRxNormCode(
  medicationCodeableConcept: MedicationCodeableConcept | undefined,
): string | null {
  const coding = medicationCodeableConcept?.coding;
  if (!Array.isArray(coding) || coding.length === 0) return null;
  return asStringOrNull(coding[0]?.code);
}

function extractDosageAndFrequency(resource: MedicationRequestResource): {
  dosageInstructions: string | null;
  frequency: string | null;
} {
  const dosageInstruction = Array.isArray(resource.dosageInstruction)
    ? resource.dosageInstruction[0]
    : undefined;
  const dosageText = asStringOrNull(dosageInstruction?.text);
  if (!dosageText) {
    return { dosageInstructions: null, frequency: null };
  }

  const [instructions, frequencyPart] = dosageText.split(" | Frequency: ");
  return {
    dosageInstructions: instructions?.trim() || dosageText,
    frequency: frequencyPart?.trim() || null,
  };
}

export function mapMedicationRequest(
  resource: MedicationRequestResource,
): MedicationDTO | null {
  const medicationCodeableConcept = resource.medicationCodeableConcept;
  const { dosageInstructions, frequency } = extractDosageAndFrequency(resource);
  const id = asStringOrNull(resource.id);
  if (!id) {
    console.warn("Skipping MedicationRequest without id", resource);
    return null;
  }

  return {
    id,
    drugName:
      asStringOrNull(medicationCodeableConcept?.text) ?? "Unnamed medication",
    rxNormCode: extractRxNormCode(medicationCodeableConcept),
    dosageInstructions,
    frequency,
    prescriber: asStringOrNull(resource.requester?.display),
    prescriberReference: asStringOrNull(resource.requester?.reference),
    startDate: asStringOrNull(resource.authoredOn),
    status: asMedicationStatus(resource.status),
  };
}

export function mapMedicationBundle(bundle: unknown): MedicationDTO[] {
  if (!bundle || typeof bundle !== "object") return [];

  const typedBundle = bundle as FhirBundle;
  const entries = Array.isArray(typedBundle.entry) ? typedBundle.entry : [];
  return entries
    .map((entry) => entry.resource)
    .filter(
      (resource): resource is MedicationRequestResource =>
        !!resource &&
        typeof resource === "object" &&
        (resource as { resourceType?: unknown }).resourceType ===
          "MedicationRequest",
    )
    .map((resource) => mapMedicationRequest(resource))
    .filter(
      (resource): resource is MedicationDTO => !!resource && !!resource.id,
    );
}

export async function fetchPatientMedications(
  patientFhirId: string,
): Promise<MedicationDTO[]> {
  const trimmed = patientFhirId.trim();
  if (!trimmed) return Promise.reject(new Error("Patient ID is required"));

  const data = await apiGet<unknown>(
    `${MEDICATION_BASE_PATH}/${encodeURIComponent(trimmed)}/medications`,
  );
  return mapMedicationBundle(data);
}

export async function fetchPatientMedicationById(
  patientFhirId: string,
  medicationId: string,
): Promise<MedicationDTO> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedMedicationId = medicationId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  if (!trimmedMedicationId) {
    return Promise.reject(new Error("Medication ID is required"));
  }

  const data = await apiGet<MedicationRequestResource>(
    `${MEDICATION_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/medications/${encodeURIComponent(trimmedMedicationId)}`,
  );
  const mapped = mapMedicationRequest(data);
  if (!mapped) {
    return Promise.reject(
      new Error("Medication response missing required id field"),
    );
  }
  return mapped;
}

export async function createPatientMedication(
  patientFhirId: string,
  input: CreateMedicationInput,
): Promise<MedicationDTO> {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  const drugName = input.drugName.trim();
  const dosageInstructions = input.dosageInstructions.trim();
  const frequency = input.frequency.trim();
  const startDate = input.startDate.trim();
  if (!drugName) {
    return Promise.reject(new Error("drugName is required"));
  }
  if (!dosageInstructions) {
    return Promise.reject(new Error("dosageInstructions is required"));
  }
  if (!frequency) {
    return Promise.reject(new Error("frequency is required"));
  }
  if (!startDate) {
    return Promise.reject(new Error("startDate is required"));
  }

  const payload = {
    drugName,
    ...(input.rxNormCode?.trim()
      ? { rxNormCode: input.rxNormCode.trim() }
      : {}),
    dosageInstructions,
    frequency,
    startDate,
  };

  const data = await apiPost<MedicationRequestResource>(
    `${MEDICATION_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/medications`,
    payload,
  );
  const mapped = mapMedicationRequest(data);
  if (!mapped) {
    return Promise.reject(
      new Error("Medication response missing required id field"),
    );
  }
  return mapped;
}

export async function updatePatientMedicationStatus(
  patientFhirId: string,
  medicationId: string,
  status: UpdatableMedicationStatus,
): Promise<MedicationDTO> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedMedicationId = medicationId.trim();
  if (!trimmedPatientId) {
    return Promise.reject(new Error("Patient ID is required"));
  }
  if (!trimmedMedicationId) {
    return Promise.reject(new Error("Medication ID is required"));
  }

  const data = await apiPatch<MedicationRequestResource>(
    `${MEDICATION_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/medications/${encodeURIComponent(trimmedMedicationId)}`,
    { status },
  );
  const mapped = mapMedicationRequest(data);
  if (!mapped) {
    return Promise.reject(
      new Error("Medication response missing required id field"),
    );
  }
  return mapped;
}
