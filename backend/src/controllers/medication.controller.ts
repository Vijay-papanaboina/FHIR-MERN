import type { Request, Response } from "express";
import { jsend } from "../utils/jsend.js";
import { AppError } from "../utils/AppError.js";
import {
  listPatientMedicationRequests,
  getPatientMedicationRequest,
  prescribeMedication,
  changeMedicationStatus,
} from "../services/medication.service.js";

const toMedicationActor = (req: Request) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const name = req.user?.name;

  if (!userId || !role) {
    throw new AppError("Authentication required", 401);
  }

  if (role !== "admin" && role !== "practitioner") {
    throw new AppError("Access denied.", 403);
  }

  return { userId, role, ...(name ? { name } : {}) };
};

/**
 * GET /api/patients/:patientFhirId/medications
 * List medication requests for a patient.
 */
export const listPatientMedicationsHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toMedicationActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await listPatientMedicationRequests(actor, patientFhirId);
  res.json(jsend.success(result));
};

/**
 * GET /api/patients/:patientFhirId/medications/:id
 * Get a single medication request by id.
 */
export const getPatientMedicationHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toMedicationActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const medicationRequestId = String(req.params.id ?? "");
  const result = await getPatientMedicationRequest(
    actor,
    patientFhirId,
    medicationRequestId,
  );
  res.json(jsend.success(result));
};

/**
 * POST /api/patients/:patientFhirId/medications
 * Create a new medication request for a patient.
 */
export const createPatientMedicationHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toMedicationActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await prescribeMedication(actor, patientFhirId, req.body);
  res.status(201).json(jsend.success(result));
};

/**
 * PATCH /api/patients/:patientFhirId/medications/:id
 * Update medication request status.
 */
export const updatePatientMedicationStatusHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toMedicationActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const medicationRequestId = String(req.params.id ?? "");
  const nextStatus = String(req.body?.status ?? "");
  if (nextStatus !== "completed" && nextStatus !== "stopped") {
    throw new AppError("status must be one of: completed, stopped", 400);
  }

  const result = await changeMedicationStatus(
    actor,
    patientFhirId,
    medicationRequestId,
    nextStatus,
  );
  res.json(jsend.success(result));
};
