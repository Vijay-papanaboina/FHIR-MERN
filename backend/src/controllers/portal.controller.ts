import type { Request, Response } from "express";
import { z } from "zod";
import {
  getPortalCareTeam,
  getPortalConditions,
  getPortalDiagnosticResults,
  getPortalDiagnostics,
  getPortalDemographics,
  getPortalAllergies,
  getPortalMedications,
  getPortalVitals,
  submitPortalVital,
} from "../services/portal.service.js";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";

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
 * GET /api/portal/me
 * Returns demographics for the linked patient account.
 */
export const getMyDemographics = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const patient = await getPortalDemographics(patientId);
  res.json(jsend.success(patient));
};

/**
 * GET /api/portal/care-team
 * Returns active care-team members for the linked patient.
 */
export const getMyCareTeam = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const members = await getPortalCareTeam(patientId);
  res.json(jsend.success(members));
};

/**
 * GET /api/portal/vitals
 * Returns vitals for the linked patient account.
 */
export const getMyVitals = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const vitals = await getPortalVitals(patientId);
  res.json(jsend.success(vitals));
};

/**
 * GET /api/portal/medications
 * Returns medication requests for the linked patient account.
 */
export const getMyMedications = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const medications = await getPortalMedications(patientId);
  res.json(jsend.success(medications));
};

/**
 * GET /api/portal/conditions
 * Returns conditions for the linked patient account.
 */
export const getMyConditions = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const conditions = await getPortalConditions(patientId);
  res.json(jsend.success(conditions));
};

/**
 * GET /api/portal/allergies
 * Returns allergies for the linked patient account.
 */
export const getMyAllergies = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const allergies = await getPortalAllergies(patientId);
  res.json(jsend.success(allergies));
};

/**
 * GET /api/portal/diagnostics
 * Returns diagnostic reports for the linked patient account.
 */
export const getMyDiagnostics = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const diagnostics = await getPortalDiagnostics(patientId);
  res.json(jsend.success(diagnostics));
};

/**
 * GET /api/portal/diagnostics/:id/results
 * Returns linked diagnostic observation results for a report.
 */
export const getMyDiagnosticResults = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const reportId = String(req.params.id ?? "");
  const results = await getPortalDiagnosticResults(patientId, reportId);
  res.json(jsend.success(results));
};

/**
 * POST /api/portal/vitals
 * Creates a patient-reported vital for the linked patient account.
 */
export const submitMyVital = async (req: Request, res: Response) => {
  const patientId = req.fhirPatientId;
  if (!patientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  const bodyResult = createVitalSchema.safeParse(req.body);
  if (!bodyResult.success) {
    throw new AppError(
      bodyResult.error.issues[0]?.message ?? "Invalid vital data",
      400,
    );
  }

  const vital = await submitPortalVital(patientId, bodyResult.data);
  res.status(201).json(jsend.success(vital));
};
