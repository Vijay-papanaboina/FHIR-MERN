import { apiGet } from "@/lib/api";
import type {
  DiagnosticReportDTO,
  DiagnosticReportStatus,
  DiagnosticResultDTO,
} from "@fhir-mern/shared";

export type {
  DiagnosticReportDTO,
  DiagnosticResultDTO,
} from "@fhir-mern/shared";

interface FhirBundleEntry {
  resource?: unknown;
}

interface FhirBundle {
  entry?: FhirBundleEntry[];
}

interface FhirCoding {
  code?: unknown;
  display?: unknown;
}

interface FhirCodeableConcept {
  text?: unknown;
  coding?: FhirCoding[];
}

interface FhirReference {
  reference?: unknown;
  display?: unknown;
}

interface DiagnosticReportResource {
  id?: unknown;
  resourceType?: unknown;
  status?: unknown;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  issued?: unknown;
  effectiveDateTime?: unknown;
  performer?: FhirReference[];
  conclusion?: unknown;
  result?: FhirReference[];
}

interface ObservationResource {
  id?: unknown;
  resourceType?: unknown;
  status?: unknown;
  code?: FhirCodeableConcept;
  valueQuantity?: {
    value?: unknown;
    unit?: unknown;
  };
  valueString?: unknown;
  valueInteger?: unknown;
  valueBoolean?: unknown;
  valueCodeableConcept?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  effectiveDateTime?: unknown;
  issued?: unknown;
}

const BASE_PATH = "/api/patients";

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const getConceptDisplay = (
  concept: FhirCodeableConcept | undefined,
  fallback = "Unknown",
): string => {
  const text = asStringOrNull(concept?.text);
  if (text) return text;
  const display = asStringOrNull(concept?.coding?.[0]?.display);
  if (display) return display;
  const code = asStringOrNull(concept?.coding?.[0]?.code);
  if (code) return code;
  return fallback;
};

const asDiagnosticReportStatus = (value: unknown): DiagnosticReportStatus => {
  if (typeof value !== "string") return "unknown";
  switch (value) {
    case "registered":
    case "partial":
    case "preliminary":
    case "final":
    case "amended":
    case "corrected":
    case "appended":
    case "cancelled":
    case "entered-in-error":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
};

const extractResultObservationIds = (
  resultRefs: FhirReference[] | undefined,
): string[] => {
  if (!Array.isArray(resultRefs)) return [];
  return Array.from(
    new Set(
      resultRefs
        .map((item) => {
          const reference = asStringOrNull(item?.reference);
          if (!reference) return null;
          const [resourceType, id] = reference.split("/");
          if (resourceType !== "Observation" || !id) return null;
          return id;
        })
        .filter((id): id is string => !!id),
    ),
  );
};

const extractObservationValue = (
  resource: ObservationResource,
): string | null => {
  const quantityValue = resource.valueQuantity?.value;
  const numeric =
    typeof quantityValue === "number"
      ? quantityValue
      : Number(quantityValue ?? Number.NaN);
  if (Number.isFinite(numeric)) {
    const unit = asStringOrNull(resource.valueQuantity?.unit);
    return unit ? `${numeric} ${unit}` : String(numeric);
  }

  const valueString = asStringOrNull(resource.valueString);
  if (valueString) return valueString;

  if (typeof resource.valueBoolean === "boolean") {
    return resource.valueBoolean ? "true" : "false";
  }

  if (typeof resource.valueInteger === "number") {
    return String(resource.valueInteger);
  }

  const codedValue = getConceptDisplay(resource.valueCodeableConcept, "");
  if (codedValue) return codedValue;

  return null;
};

export const mapDiagnosticReportResource = (
  resource: DiagnosticReportResource,
): DiagnosticReportDTO | null => {
  const id = asStringOrNull(resource.id);
  if (!id) {
    console.warn("Skipping DiagnosticReport without id");
    return null;
  }

  return {
    id,
    status: asDiagnosticReportStatus(resource.status),
    category: resource.category?.[0]
      ? getConceptDisplay(resource.category[0], "Unknown")
      : null,
    code: getConceptDisplay(resource.code, "Unknown report"),
    issued: asStringOrNull(resource.issued),
    effectiveDateTime: asStringOrNull(resource.effectiveDateTime),
    performer: asStringOrNull(resource.performer?.[0]?.display),
    conclusion: asStringOrNull(resource.conclusion),
    resultObservationIds: extractResultObservationIds(resource.result),
  };
};

export const mapDiagnosticReportBundle = (
  bundle: unknown,
): DiagnosticReportDTO[] => {
  if (!bundle || typeof bundle !== "object") return [];
  const entries = Array.isArray((bundle as FhirBundle).entry)
    ? (bundle as FhirBundle).entry!
    : [];

  return entries
    .map((entry) => entry.resource)
    .filter(
      (resource): resource is DiagnosticReportResource =>
        !!resource &&
        typeof resource === "object" &&
        (resource as { resourceType?: unknown }).resourceType ===
          "DiagnosticReport",
    )
    .map((resource) => mapDiagnosticReportResource(resource))
    .filter((item): item is DiagnosticReportDTO => !!item);
};

export const mapDiagnosticResultResource = (
  resource: ObservationResource,
): DiagnosticResultDTO | null => {
  const id = asStringOrNull(resource.id);
  if (!id) {
    console.warn("Skipping Observation without id in diagnostic results");
    return null;
  }

  return {
    id,
    status: asStringOrNull(resource.status),
    code: getConceptDisplay(resource.code, "Unknown result"),
    value: extractObservationValue(resource),
    interpretation: getConceptDisplay(resource.interpretation?.[0], ""),
    recordedAt:
      asStringOrNull(resource.effectiveDateTime) ??
      asStringOrNull(resource.issued),
  };
};

export const mapDiagnosticResultBundle = (
  bundle: unknown,
): DiagnosticResultDTO[] => {
  if (!bundle || typeof bundle !== "object") return [];
  const entries = Array.isArray((bundle as FhirBundle).entry)
    ? (bundle as FhirBundle).entry!
    : [];

  return entries
    .map((entry) => entry.resource)
    .filter(
      (resource): resource is ObservationResource =>
        !!resource &&
        typeof resource === "object" &&
        (resource as { resourceType?: unknown }).resourceType === "Observation",
    )
    .map((resource) => mapDiagnosticResultResource(resource))
    .filter((item): item is DiagnosticResultDTO => !!item);
};

export async function fetchPatientDiagnostics(
  patientFhirId: string,
): Promise<DiagnosticReportDTO[]> {
  const trimmedId = patientFhirId.trim();
  if (!trimmedId) return Promise.reject(new Error("Patient ID is required"));

  const data = await apiGet<unknown>(
    `${BASE_PATH}/${encodeURIComponent(trimmedId)}/diagnostics`,
  );
  return mapDiagnosticReportBundle(data);
}

export async function fetchPatientDiagnosticResults(
  patientFhirId: string,
  reportId: string,
): Promise<DiagnosticResultDTO[]> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedReportId = reportId.trim();
  if (!trimmedPatientId)
    return Promise.reject(new Error("Patient ID is required"));
  if (!trimmedReportId) {
    return Promise.reject(new Error("Diagnostic report ID is required"));
  }

  const data = await apiGet<unknown>(
    `${BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/diagnostics/${encodeURIComponent(trimmedReportId)}/results`,
  );
  return mapDiagnosticResultBundle(data);
}
