import { z } from "zod";

/**
 * Zod schema for linking a patient user to a FHIR Patient record.
 */
export const linkPatientSchema = z.object({
  fhirPatientId: z
    .string()
    .regex(/^[A-Za-z0-9\-.]{1,64}$/, "Invalid FHIR Patient ID format"),
});

export type LinkPatientInput = z.infer<typeof linkPatientSchema>;
