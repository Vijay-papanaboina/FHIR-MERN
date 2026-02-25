/** Shared constants */

/** Badge variant mapping for patient gender display */
export const GENDER_VARIANT: Record<
    "male" | "female" | "other" | "unknown",
    "default" | "secondary" | "outline"
> = {
    male: "default",
    female: "secondary",
    other: "outline",
    unknown: "outline",
}

/** Predefined vital type presets with LOINC codes and units */
export const VITAL_PRESETS = [
    { code: "8867-4", display: "Heart rate", unit: "beats/minute", unitCode: "/min", example: "72" },
    { code: "8310-5", display: "Body temperature", unit: "°C", unitCode: "Cel", example: "36.6" },
    { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg", unitCode: "mm[Hg]", example: "120" },
    { code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg", unitCode: "mm[Hg]", example: "80" },
    { code: "9279-1", display: "Respiratory rate", unit: "breaths/minute", unitCode: "/min", example: "16" },
    { code: "59408-5", display: "Oxygen saturation", unit: "%", unitCode: "%", example: "98" },
] as const
