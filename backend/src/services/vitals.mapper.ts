import type { VitalsDTO } from '@fhir-mern/shared';

/** Raw FHIR Observation shape (fields we care about). */
interface FhirObservation {
    resourceType?: string;
    id?: string;
    code?: {
        text?: string;
        coding?: { display?: string; code?: string }[];
    };
    valueQuantity?: {
        value?: number;
        unit?: string;
    };
    effectiveDateTime?: string;
}

/**
 * Extract a display name from the Observation code.
 * Prefers code.text, falls back to first coding display.
 */
const getObservationType = (obs: FhirObservation): string => {
    if (obs.code?.text) return obs.code.text;
    if (obs.code?.coding?.[0]?.display) return obs.code.coding[0].display;
    return 'Unknown';
};

/** Extract the LOINC code if present. */
const getObservationCode = (obs: FhirObservation): string | null => {
    return obs.code?.coding?.[0]?.code ?? null;
};

/**
 * Map a raw FHIR Observation resource to a clean VitalsDTO.
 * Throws if the resource has no id or is not an Observation.
 */
export const toVitalsDTO = (resource: Record<string, unknown>): VitalsDTO => {
    const obs = resource as FhirObservation;

    if (obs.resourceType && obs.resourceType !== 'Observation') {
        throw new Error(`Expected Observation resource, got ${obs.resourceType}`);
    }

    if (typeof obs.id !== 'string' || obs.id.trim() === '') {
        throw new Error('Observation resource is missing an id');
    }

    return {
        id: obs.id,
        code: getObservationCode(obs),
        type: getObservationType(obs),
        value: obs.valueQuantity?.value ?? null,
        unit: obs.valueQuantity?.unit ?? null,
        recordedAt: obs.effectiveDateTime ?? null,
    };
};

/**
 * Map a FHIR Bundle of Observation entries to an array of VitalsDTOs.
 * Skips entries without a resource, without resourceType 'Observation', or missing an id.
 * Note: Bundles always include resourceType, so we strictly require it here,
 * while toVitalsDTO is lenient for standalone resources that may omit it.
 */
export const toBundleOfVitalsDTOs = (bundle: Record<string, unknown>): VitalsDTO[] => {
    const entries = (bundle as { entry?: { resource?: Record<string, unknown> }[] }).entry;
    if (!entries || entries.length === 0) return [];

    return entries
        .filter((entry) => {
            const r = entry.resource as FhirObservation | undefined;
            return r && r.resourceType === 'Observation' && typeof r.id === 'string' && r.id.trim() !== '';
        })
        .map((entry) => toVitalsDTO(entry.resource!));
};
