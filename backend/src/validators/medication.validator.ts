import { z } from "zod";
import type { MedicationRequestStatus } from "../repositories/medication-request.repository.js";

const FHIR_ID_REGEX = /^[A-Za-z0-9\-.]{1,64}$/;

export const fhirIdSchema = z
  .string()
  .regex(FHIR_ID_REGEX, "Invalid FHIR ID format");

export const createMedicationSchema = z.object({
  drugName: z
    .string()
    .trim()
    .min(1, "drugName is required")
    .max(256, "drugName is too long"),
  rxNormCode: z
    .string()
    .trim()
    .min(1, "rxNormCode cannot be empty")
    .max(64, "rxNormCode is too long")
    .optional(),
});

export const updateMedicationStatusSchema = z.object({
  status: z.enum(["completed", "stopped"], {
    message: "status must be one of: completed, stopped",
  }),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationStatusInput = z.infer<
  typeof updateMedicationStatusSchema
>;
export type UpdatableMedicationStatus = UpdateMedicationStatusInput["status"];
export type AnyMedicationStatus = MedicationRequestStatus;
