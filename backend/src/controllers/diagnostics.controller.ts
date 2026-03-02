import type { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";
import {
  getPatientDiagnostic,
  listPatientDiagnosticResults,
  listPatientDiagnostics,
} from "../services/diagnostics.service.js";

const toDiagnosticsActor = (req: Request) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    throw new AppError("Authentication required", 401);
  }
  if (role !== "admin" && role !== "practitioner") {
    throw new AppError("Access denied.", 403);
  }

  return { userId, role };
};

export const listPatientDiagnosticsHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toDiagnosticsActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await listPatientDiagnostics(actor, patientFhirId);
  res.json(jsend.success(result));
};

export const getPatientDiagnosticHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toDiagnosticsActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const reportId = String(req.params.id ?? "");
  const result = await getPatientDiagnostic(actor, patientFhirId, reportId);
  res.json(jsend.success(result));
};

export const listPatientDiagnosticResultsHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toDiagnosticsActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const reportId = String(req.params.id ?? "");
  const result = await listPatientDiagnosticResults(
    actor,
    patientFhirId,
    reportId,
  );
  res.json(jsend.success(result));
};
