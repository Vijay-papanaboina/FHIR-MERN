import { z } from "zod";
import type {
  CreateAppointmentRequestInput,
  UpdateAppointmentDecisionInput,
} from "@fhir-mern/shared";

const FHIR_ID_REGEX = /^[A-Za-z0-9\-.]{1,64}$/;

export const fhirIdSchema = z
  .string()
  .trim()
  .regex(FHIR_ID_REGEX, "Invalid FHIR ID format");

export const createAppointmentRequestSchema = z.object({
  careTeamUserId: z
    .string()
    .trim()
    .min(1, "careTeamUserId is required")
    .max(128, "careTeamUserId is too long"),
  start: z
    .string()
    .trim()
    .min(1, "start is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "start must be a valid datetime",
    }),
  end: z
    .string()
    .trim()
    .min(1, "end is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "end must be a valid datetime",
    }),
  reason: z.string().trim().max(512, "reason is too long").optional(),
  note: z.string().trim().max(1024, "note is too long").optional(),
});

export const updateAppointmentDecisionSchema = z.object({
  status: z.enum(["confirmed", "declined", "cancelled"], {
    message: "status must be one of: confirmed, declined, cancelled",
  }),
  comment: z.string().trim().max(1024, "comment is too long").optional(),
});

export type CreateAppointmentRequestPayload = CreateAppointmentRequestInput;
export type UpdateAppointmentDecisionPayload = UpdateAppointmentDecisionInput;
