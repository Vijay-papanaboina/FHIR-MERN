import type { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/auth.model.js";
import { getAssignmentsByPatient } from "../repositories/assignment.repository.js";
import { getPatient } from "../services/patient.service.js";
import {
  createPatientReportedVital,
  getPatientVitals,
} from "../services/vitals.service.js";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";

interface CareTeamMemberDTO {
  name: string;
  image?: string;
  assignmentRole: "primary" | "covering" | "consulting";
}

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

  const patient = await getPatient(patientId);
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

  const assignments = await getAssignmentsByPatient(patientId, true);
  const practitionerIds = [...new Set(assignments.map((a) => a.assignedUserId))];
  const practitioners = await User.find(
    { _id: { $in: practitionerIds } },
    { name: 1, image: 1, role: 1 },
  ).lean();

  const practitionersById = new Map(
    practitioners.map((p) => [String(p._id), p] as const),
  );

  const members = assignments
    .map((assignment) => {
      const practitioner = practitionersById.get(assignment.assignedUserId);
      if (!practitioner || practitioner.role !== "practitioner") {
        return null;
      }

      const member: CareTeamMemberDTO = {
        name: practitioner.name,
        assignmentRole: assignment.assignmentRole,
      };
      if (typeof practitioner.image === "string") {
        member.image = practitioner.image;
      }
      return member;
    })
    .filter((m): m is CareTeamMemberDTO => !!m);

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

  const vitals = await getPatientVitals(patientId);
  res.json(jsend.success(vitals));
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

  const vital = await createPatientReportedVital(patientId, bodyResult.data);
  res.status(201).json(jsend.success(vital));
};
