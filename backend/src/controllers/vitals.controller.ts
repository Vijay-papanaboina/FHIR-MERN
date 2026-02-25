import type { Request, Response } from "express";
import { z } from "zod";
import { jsend } from "../utils/jsend.js";
import { AppError } from "../utils/AppError.js";
import {
  getPatientVitals,
  createPatientVital,
} from "../services/vitals.service.js";

// ── Validation schemas ──────────────────────────────────────────
const patientIdSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9\-.]{1,64}$/, "Invalid Patient ID format"),
});

const createVitalSchema = z.object({
  code: z.string().min(1, "LOINC code is required"),
  display: z
    .string()
    .min(1, "Display name is required")
    .max(256, "Display name is too long"),
  value: z
    .number({ message: "Value is required" })
    .finite("Value must be a finite number"),
  unit: z.string().min(1, "Unit is required"),
  unitCode: z.string().min(1, "Unit code is required"),
  effectiveDateTime: z
    .string()
    .datetime({ message: "Must be a valid ISO datetime" })
    .optional(),
});

/**
 * GET /api/patients/:id/vitals
 * Get all vital-sign observations for a patient.
 */
export const getVitalsHandler = async (req: Request, res: Response) => {
  const result = patientIdSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid Patient ID",
      400,
    );
  }

  const vitals = await getPatientVitals(result.data.id);
  res.json(jsend.success(vitals));
};

/**
 * POST /api/patients/:id/vitals
 * Create a new vital-sign observation for a patient.
 */
export const createVitalHandler = async (req: Request, res: Response) => {
  const idResult = patientIdSchema.safeParse(req.params);
  if (!idResult.success) {
    throw new AppError(
      idResult.error.issues[0]?.message ?? "Invalid Patient ID",
      400,
    );
  }

  const bodyResult = createVitalSchema.safeParse(req.body);
  if (!bodyResult.success) {
    throw new AppError(
      bodyResult.error.issues[0]?.message ?? "Invalid vital data",
      400,
    );
  }

  const vital = await createPatientVital(idResult.data.id, bodyResult.data);
  res.status(201).json(jsend.success(vital));
};
