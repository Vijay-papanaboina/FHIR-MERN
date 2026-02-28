import type { Request, Response } from "express";
import { jsend } from "../utils/jsend.js";
import { AppError } from "../utils/AppError.js";
import { createAssignmentSchema } from "../validators/assignment.validator.js";
import {
  assignPatient,
  getAllSystemAssignments,
  removeAssignment,
  getPatientAssignments,
  getUserAssignments,
  getPractitioners,
} from "../services/assignment.service.js";

/**
 * POST /api/assignments
 * Create a new patient assignment (admin only).
 */
export const createAssignmentHandler = async (req: Request, res: Response) => {
  const result = createAssignmentSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid assignment data",
      400,
    );
  }

  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }

  const assignment = await assignPatient(req.user.id, result.data);
  res.status(201).json(jsend.success(assignment));
};

/**
 * DELETE /api/assignments/:id
 * Deactivate an assignment (admin only).
 */
export const deactivateAssignmentHandler = async (
  req: Request,
  res: Response,
) => {
  if (!req.params.id) {
    throw new AppError("Assignment ID is required", 400);
  }
  const id = String(req.params.id);

  const assignment = await removeAssignment(id);
  res.json(jsend.success(assignment));
};

/**
 * GET /api/assignments
 * List all assignments. Optional query filter: ?patientFhirId=xxx
 */
export const listAssignmentsHandler = async (req: Request, res: Response) => {
  const { patientFhirId } = req.query;

  if (typeof patientFhirId === "string" && patientFhirId.length > 0) {
    const assignments = await getPatientAssignments(patientFhirId);
    return res.json(jsend.success(assignments));
  }

  const assignments = await getAllSystemAssignments(true);
  return res.json(jsend.success(assignments));
};

/**
 * GET /api/assignments/user/:userId
 * List assignments for a specific practitioner (admin only).
 */
export const getUserAssignmentsHandler = async (
  req: Request,
  res: Response,
) => {
  if (!req.params.userId) {
    throw new AppError("User ID is required", 400);
  }
  const userId = String(req.params.userId);

  const assignments = await getUserAssignments(userId);
  res.json(jsend.success(assignments));
};

/**
 * GET /api/users/practitioners
 * List all practitioners in the system (admin only).
 */
export const listPractitionersHandler = async (
  _req: Request,
  res: Response,
) => {
  const practitioners = await getPractitioners();
  res.json(jsend.success(practitioners));
};
