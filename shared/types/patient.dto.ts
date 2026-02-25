/**
 * Clean Patient data structure sent to the frontend.
 * Mapped from raw FHIR Patient resources.
 */

/** FHIR administrative gender codes */
export type AdministrativeGender = 'male' | 'female' | 'other' | 'unknown';

export interface PatientDTO {
    /** FHIR resource ID */
    readonly id: string;
    /** Full name as a single display string (e.g., "John Michael Smith") */
    readonly displayName: string;
    /** Date of birth — FHIR allows partial dates: "YYYY", "YYYY-MM", or "YYYY-MM-DD". Null if unknown. */
    readonly birthDate: string | null;
    /** @see AdministrativeGender */
    readonly gender: AdministrativeGender;
}
