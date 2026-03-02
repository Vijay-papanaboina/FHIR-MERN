import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";
import {
  changeUserRole,
  linkPractitionerToUser,
  linkPatientToUser,
  listSafeUsers,
} from "../services/user.service.js";
import {
  linkPractitionerSchema,
  linkPatientSchema,
  updateUserRoleSchema,
} from "../validators/user.validator.js";

const userIdParamSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * GET /api/users
 * List users for admin management table.
 */
export const listUsersHandler = async (req: Request, res: Response) => {
  const queryResult = listUsersQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new AppError(
      queryResult.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  const result = await listSafeUsers({
    page: queryResult.data.page,
    limit: queryResult.data.limit,
    ...(queryResult.data.q !== undefined ? { q: queryResult.data.q } : {}),
  });
  res.json(jsend.success(result));
};

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
 * PATCH /api/users/:userId/link-practitioner
 * Link a practitioner user account to a FHIR Practitioner record.
 */
export const linkPractitionerHandler = async (req: Request, res: Response) => {
  const paramResult = userIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    throw new AppError(
      paramResult.error.issues[0]?.message ?? "Invalid userId",
      400,
    );
  }

  const bodyResult = linkPractitionerSchema.safeParse(req.body);
  if (!bodyResult.success) {
    throw new AppError(
      bodyResult.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  const user = await linkPractitionerToUser(
    paramResult.data.userId,
    bodyResult.data.fhirPractitionerId,
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
