/**
 * Clean Vitals data structure sent to the frontend.
 * Mapped from raw FHIR Observation resources (vital-signs category).
 */
export interface VitalsDTO {
    /** FHIR Observation resource ID */
    readonly id: string;
    /** LOINC code for the observation type (e.g., "8867-4" for heart rate). Null if absent. */
    readonly code: string | null;
    /** Type of vital sign (e.g., "Heart rate", "Blood Pressure") */
    readonly type: string;
    /** Numeric value of the observation */
    readonly value: number | null;
    /** Unit of measurement (e.g., "beats/minute", "mmHg"). Null if absent. */
    readonly unit: string | null;
    /** When the observation was recorded (ISO datetime) */
    readonly recordedAt: string | null;
}

/**
 * Payload for creating a new vital sign observation.
 */
export interface CreateVitalInput {
    /** LOINC code for the observation type */
    readonly code: string;
    /** Display name for the observation type */
    readonly display: string;
    /** Numeric value */
    readonly value: number;
    /** Unit of measurement */
    readonly unit: string;
    /** UCUM unit code (e.g., "/min", "mm[Hg]") */
    readonly unitCode: string;
    /** When the observation was taken (ISO datetime). Defaults to now if omitted. */
    readonly effectiveDateTime?: string | undefined;
}
