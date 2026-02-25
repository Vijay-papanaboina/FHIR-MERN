import type { PatientDTO } from "@fhir-mern/shared";

/**
 * FHIR HumanName structure (simplified).
 * @see https://hl7.org/fhir/datatypes.html#HumanName
 *
 * Note: `prefix` and `suffix` are intentionally excluded from display name
 * generation to keep names clean and consistent (no titles like "Dr." etc.).
 */
interface FhirHumanName {
  use?: string;
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

/** Raw FHIR Patient resource shape (fields we care about). */
interface FhirPatient {
  resourceType?: string;
  id?: string;
  name?: FhirHumanName[];
  gender?: string;
  birthDate?: string;
}

const VALID_GENDERS = new Set(["male", "female", "other", "unknown"]);

/**
 * Build a display name from a FHIR HumanName.
 * Prefers `text` if available, otherwise joins given + family.
 */
const buildDisplayName = (names?: FhirHumanName[]): string => {
  if (!names || names.length === 0) return "Unknown";

  // Prefer the "official" name, fall back to first
  const name = names.find((n) => n.use === "official") ?? names[0]!;

  // If a pre-built text is available, use it
  if (name.text) return name.text;

  const parts: string[] = [];
  if (name.given) parts.push(...name.given);
  if (name.family) parts.push(name.family);

  return parts.length > 0 ? parts.join(" ") : "Unknown";
};

/**
 * Map a raw FHIR Patient resource to a clean PatientDTO.
 * Throws if the resource has no id or is not a Patient resource.
 */
export const toPatientDTO = (resource: Record<string, unknown>): PatientDTO => {
  const patient = resource as unknown as FhirPatient;

  if (patient.resourceType && patient.resourceType !== "Patient") {
    throw new Error(`Expected Patient resource, got ${patient.resourceType}`);
  }

  if (!patient.id) {
    throw new Error("Patient resource is missing an id");
  }

  const gender =
    patient.gender && VALID_GENDERS.has(patient.gender)
      ? (patient.gender as PatientDTO["gender"])
      : "unknown";

  return {
    id: patient.id,
    displayName: buildDisplayName(patient.name),
    birthDate: patient.birthDate ?? null,
    gender,
  };
};

/**
 * Map a FHIR Bundle of Patient entries to an array of PatientDTOs.
 * Skips entries without a resource, without resourceType 'Patient', or missing an id.
 * Note: Bundles always include resourceType, so we strictly require it here,
 * while toPatientDTO is lenient for standalone resources that may omit it.
 */
export const toBundleOfPatientDTOs = (
  bundle: Record<string, unknown>,
): PatientDTO[] => {
  const entries = (
    bundle as { entry?: { resource?: Record<string, unknown> }[] }
  ).entry;
  if (!entries || entries.length === 0) return [];

  return entries
    .filter((entry) => {
      const r = entry.resource as FhirPatient | undefined;
      return (
        r &&
        r.resourceType === "Patient" &&
        typeof r.id === "string" &&
        r.id.trim() !== ""
      );
    })
    .map((entry) => toPatientDTO(entry.resource!));
};
