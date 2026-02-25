import type { VitalsDTO, CreateVitalInput } from '@fhir-mern/shared';
import { getVitalsByPatientId, createVital } from '../repositories/observation.repository.js';
import { toVitalsDTO, toBundleOfVitalsDTOs } from './vitals.mapper.js';

/**
 * Get all vital-sign observations for a patient.
 */
export const getPatientVitals = async (patientId: string): Promise<VitalsDTO[]> => {
    const bundle = await getVitalsByPatientId(patientId);
    return toBundleOfVitalsDTOs(bundle);
};

/**
 * Create a new vital-sign observation for a patient.
 * Constructs the FHIR Observation JSON from the clean input.
 */
export const createPatientVital = async (patientId: string, input: CreateVitalInput): Promise<VitalsDTO> => {
    const observation: Record<string, unknown> = {
        resourceType: 'Observation',
        status: 'final',
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
            }],
        }],
        code: {
            coding: [{
                system: 'http://loinc.org',
                code: input.code,
                display: input.display,
            }],
            text: input.display,
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: input.effectiveDateTime ?? new Date().toISOString(),
        valueQuantity: {
            value: input.value,
            unit: input.unit,
            system: 'http://unitsofmeasure.org',
            code: input.unitCode,
        },
    };

    const created = await createVital(observation);
    return toVitalsDTO(created);
};
