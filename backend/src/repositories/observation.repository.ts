import { fhirGet, fhirPost, fhirBaseUrl } from "./fhir.client.js";

/**
 * Fetch vital-sign Observations for a patient.
 * Uses the FHIR category filter for vital-signs.
 * Returns the raw FHIR Bundle response.
 */
export const getVitalsByPatientId = async (
  patientId: string,
): Promise<Record<string, unknown>> => {
  const url = `${fhirBaseUrl()}/Observation?patient=${encodeURIComponent(patientId)}&category=vital-signs&_sort=-date`;
  return fhirGet(url);
};

/**
 * Create a new Observation resource on the FHIR server.
 * Returns the created FHIR Observation resource.
 */
export const createVital = async (
  observation: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  return fhirPost(`${fhirBaseUrl()}/Observation`, observation);
};
