import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const FHIR_TIMEOUT_MS = 10_000;

/**
 * Shared headers for FHIR requests.
 * Content-Type is only needed for POST/PUT, so it's opt-in.
 */
const getFhirHeaders = (includeContentType = false): Record<string, string> => {
    const headers: Record<string, string> = {
        'Accept': 'application/fhir+json',
    };

    if (includeContentType) {
        headers['Content-Type'] = 'application/fhir+json';
    }

    if (env.FHIR_USERNAME && env.FHIR_PASSWORD) {
        const credentials = Buffer.from(`${env.FHIR_USERNAME}:${env.FHIR_PASSWORD}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
};

/**
 * Shared fetch wrapper with timeout and JSON error handling.
 */
const fhirFetch = async (url: string): Promise<Record<string, unknown>> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FHIR_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: getFhirHeaders(),
            signal: controller.signal,
        });

        if (response.status === 404) {
            throw new AppError('Resource not found', 404);
        }

        if (!response.ok) {
            throw new AppError(`FHIR request failed with status ${response.status}`, 502);
        }

        try {
            const body = (await response.json()) as Record<string, unknown>;
            return body;
        } catch {
            throw new AppError('FHIR server returned malformed JSON', 502);
        }
    } catch (error) {
        if (error instanceof AppError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
            throw new AppError('FHIR request timed out', 504);
        }
        throw new AppError('FHIR request failed', 502);
    } finally {
        clearTimeout(timeout);
    }
};

/**
 * Search for patients by name.
 * Returns the raw FHIR Bundle response.
 */
export const searchPatientsByName = async (name: string): Promise<Record<string, unknown>> => {
    const baseUrl = env.FHIR_BASE_URL.replace(/\/+$/, '');
    return fhirFetch(`${baseUrl}/Patient?name=${encodeURIComponent(name)}`);
};

/**
 * Fetch a single Patient resource by FHIR ID.
 * Returns the raw FHIR Patient resource.
 */
export const getPatientById = async (id: string): Promise<Record<string, unknown>> => {
    const baseUrl = env.FHIR_BASE_URL.replace(/\/+$/, '');
    return fhirFetch(`${baseUrl}/Patient/${encodeURIComponent(id)}`);
};
