import { z } from "zod";
import type {
  CreateAllergyInput,
  CreateConditionInput,
  UpdatableAllergyStatus,
  UpdatableConditionStatus,
} from "@fhir-mern/shared";

const FHIR_ID_REGEX = /^[A-Za-z0-9\-.]{1,64}$/;

export const fhirIdSchema = z
  .string()
  .trim()
  .regex(FHIR_ID_REGEX, "Invalid FHIR ID format");

const dateLikeSchema = z
  .string()
  .trim()
  .min(1, "recordedDate is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "recordedDate must be a valid date/datetime",
  });

export const createConditionSchema = z.object({
  diagnosis: z
    .string()
    .trim()
    .min(1, "diagnosis is required")
    .max(256, "diagnosis is too long"),
  snomedCode: z
    .string()
    .trim()
    .min(1, "snomedCode cannot be empty")
    .max(64, "snomedCode is too long")
    .optional(),
  recordedDate: dateLikeSchema,
  note: z.string().trim().max(1024, "note is too long").optional(),
  clinicalStatus: z.enum(["active", "inactive", "resolved"]).optional(),
});

export const updateConditionStatusSchema = z.object({
  status: z.enum(["inactive", "resolved", "entered-in-error"], {
    message: "status must be one of: inactive, resolved, entered-in-error",
  }),
});

export const createAllergySchema = z.object({
  substance: z
    .string()
    .trim()
    .min(1, "substance is required")
    .max(256, "substance is too long"),
  snomedCode: z
    .string()
    .trim()
    .min(1, "snomedCode cannot be empty")
    .max(64, "snomedCode is too long")
    .optional(),
  recordedDate: dateLikeSchema,
  note: z.string().trim().max(1024, "note is too long").optional(),
  reaction: z.string().trim().max(512, "reaction is too long").optional(),
  criticality: z.enum(["low", "high", "unable-to-assess"]).optional(),
  clinicalStatus: z.enum(["active", "inactive", "resolved"]).optional(),
});

export const updateAllergyStatusSchema = z.object({
  status: z.enum(["inactive", "resolved", "entered-in-error"], {
    message: "status must be one of: inactive, resolved, entered-in-error",
  }),
});

export type UpdateConditionStatusInput = z.infer<
  typeof updateConditionStatusSchema
>;

export type UpdateAllergyStatusInput = z.infer<
  typeof updateAllergyStatusSchema
>;
export type {
  CreateConditionInput,
  UpdatableConditionStatus,
  CreateAllergyInput,
  UpdatableAllergyStatus,
};
