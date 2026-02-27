import type { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/auth.model.js";
import { getPatient } from "../services/patient.service.js";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";
import { linkPatientSchema } from "../validators/user.validator.js";

const userIdParamSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

/**
 * PATCH /api/users/:userId/link-patient
 * Link a patient user account to a FHIR Patient record.
 */
export const linkPatientHandler = async (req: Request, res: Response) => {
  const paramResult = userIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    throw new AppError(
      paramResult.error.issues[0]?.message ?? "Invalid userId",
      400,
    );
  }

  const bodyResult = linkPatientSchema.safeParse(req.body);
  if (!bodyResult.success) {
    throw new AppError(
      bodyResult.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  const user = await User.findById(paramResult.data.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role !== "patient") {
    throw new AppError("Target user must have patient role", 403);
  }

  // Verify patient exists in FHIR before linking.
  await getPatient(bodyResult.data.fhirPatientId);

  user.fhirPatientId = bodyResult.data.fhirPatientId;
  await user.save();

  res.json(
    jsend.success({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      fhirPatientId: user.fhirPatientId,
    }),
  );
};
