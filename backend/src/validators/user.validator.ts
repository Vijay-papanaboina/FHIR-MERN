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

/**
 * Zod schema for linking a practitioner user to a FHIR Practitioner record.
 */
export const linkPractitionerSchema = z.object({
  fhirPractitionerId: z
    .string()
    .regex(/^[A-Za-z0-9\-.]{1,64}$/, "Invalid FHIR Practitioner ID format"),
});

export type LinkPractitionerInput = z.infer<typeof linkPractitionerSchema>;

/**
 * Zod schema for updating a user's system role.
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(["patient", "practitioner", "admin"], {
    message: "role must be one of: patient, practitioner, admin",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
