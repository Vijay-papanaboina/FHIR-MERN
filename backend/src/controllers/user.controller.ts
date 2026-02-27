import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";
import { changeUserRole, linkPatientToUser } from "../services/user.service.js";
import {
  linkPatientSchema,
  updateUserRoleSchema,
} from "../validators/user.validator.js";

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

  const user = await linkPatientToUser(
    paramResult.data.userId,
    bodyResult.data.fhirPatientId,
  );
  res.json(jsend.success(user));
};

/**
 * PATCH /api/users/:userId/role
 * Update a user's system role (admin only).
 */
export const updateUserRoleHandler = async (req: Request, res: Response) => {
  const paramResult = userIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    throw new AppError(
      paramResult.error.issues[0]?.message ?? "Invalid userId",
      400,
    );
  }

  const bodyResult = updateUserRoleSchema.safeParse(req.body);
  if (!bodyResult.success) {
    throw new AppError(
      bodyResult.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  const user = await changeUserRole(
    paramResult.data.userId,
    bodyResult.data.role,
    req.user?.id,
  );
  res.json(jsend.success(user));
};
