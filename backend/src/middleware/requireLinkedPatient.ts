import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

declare global {
  namespace Express {
    interface Request {
      fhirPatientId?: string;
    }
  }
}

/**
 * Ensures a patient account is linked to a FHIR Patient record.
 * Assumes requireAuth + requireRole("patient") already ran.
 */
export const requireLinkedPatient = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const linkedFhirPatientId = req.user?.fhirPatientId;

  if (!linkedFhirPatientId) {
    throw new AppError("Account not yet linked to a patient record", 403);
  }

  req.fhirPatientId = linkedFhirPatientId;
  next();
};
