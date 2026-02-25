import { fhirGet, fhirBaseUrl } from './fhir.client.js';

/**
 * Search for patients by name.
 * Returns the raw FHIR Bundle response.
 */
export const searchPatientsByName = async (name: string): Promise<Record<string, unknown>> => {
    return fhirGet(`${fhirBaseUrl()}/Patient?name=${encodeURIComponent(name)}`);
};

/**
 * Fetch a single Patient resource by FHIR ID.
 * Returns the raw FHIR Patient resource.
 */
export const getPatientById = async (id: string): Promise<Record<string, unknown>> => {
    return fhirGet(`${fhirBaseUrl()}/Patient/${encodeURIComponent(id)}`);
};
