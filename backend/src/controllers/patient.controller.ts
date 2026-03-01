import type { Request, Response } from "express";
import { z } from "zod";
import { jsend } from "../utils/jsend.js";
import { AppError } from "../utils/AppError.js";
import { searchPatients, getPatient } from "../services/patient.service.js";
import { getUserAssignments } from "../services/assignment.service.js";
import { logger } from "../utils/logger.js";
import type { AssignmentRole } from "../models/assignment.model.js";

// ── Validation schemas ──────────────────────────────────────────
const searchQuerySchema = z.object({
  name: z
    .string()
    .min(1, "name query parameter is required")
    .max(256, "name is too long"),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9\-.]{1,64}$/, "Invalid Patient ID format"),
});

/**
 * GET /api/patients?name=xxx
 * Search for patients by name (admin only).
 */
export const searchPatientsHandler = async (req: Request, res: Response) => {
  const result = searchQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  const patients = await searchPatients(result.data.name);
  res.json(jsend.success(patients));
};

/**
 * GET /api/patients/:id
 * Get a single patient by FHIR ID.
 * Requires active assignment (or admin).
 */
export const getPatientHandler = async (req: Request, res: Response) => {
  const result = idParamSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid Patient ID",
      400,
    );
  }

  const patient = await getPatient(result.data.id);
  res.json(jsend.success(patient));
};

/**
 * GET /api/patients/:id/assignment-role
 * Get the current user's assignment role for a specific patient.
 * Admins return "admin" since assignment checks are bypassed.
 */
export const getPatientAssignmentRoleHandler = async (
  req: Request,
  res: Response,
) => {
  const result = idParamSchema.safeParse(req.params);
  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid Patient ID",
      400,
    );
  }

  if (!req.user?.role) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role === "admin") {
    return res.json(jsend.success({ assignmentRole: "admin" as const }));
  }

  const assignmentRole = req.assignment?.assignmentRole as
    | AssignmentRole
    | undefined;
  if (!assignmentRole) {
    throw new AppError("Assignment role not found", 403);
  }

  return res.json(jsend.success({ assignmentRole }));
};

/**
 * GET /api/patients/assigned
 * Get all patients assigned to the current user.
 * Fetches active assignments, then resolves each to a PatientDTO from FHIR.
 */
export const getAssignedPatientsHandler = async (
  req: Request,
  res: Response,
) => {
  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }

  const assignments = await getUserAssignments(req.user.id);

  // Fetch each assigned patient from FHIR — use allSettled so one
  // missing/failed patient record doesn't break the entire response.
  const results = await Promise.allSettled(
    assignments.map((a) => getPatient(a.patientFhirId)),
  );

  const patients = results.flatMap((r, i) => {
    if (r.status === "fulfilled") return [r.value];
    logger.warn(
      `Failed to fetch patient ${assignments[i]!.patientFhirId}: %s`,
      r.reason instanceof Error ? r.reason.message : String(r.reason),
    );
    return [];
  });

  res.json(jsend.success(patients));
};
