import type { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";
import {
  changePatientAllergyStatus,
  changePatientConditionStatus,
  createPatientAllergy,
  createPatientCondition,
  getPatientAllergy,
  getPatientCondition,
  listPatientAllergies,
  listPatientConditions,
  removePatientAllergy,
  removePatientCondition,
} from "../services/conditions-allergies.service.js";
import type {
  UpdatableAllergyStatus,
  UpdatableConditionStatus,
} from "../validators/conditions-allergies.validator.js";

const toClinicalRecordActor = (req: Request) => {
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

export const listPatientConditionsHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await listPatientConditions(actor, patientFhirId);
  res.json(jsend.success(result));
};

export const getPatientConditionHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const conditionId = String(req.params.id ?? "");
  const result = await getPatientCondition(actor, patientFhirId, conditionId);
  res.json(jsend.success(result));
};

export const createPatientConditionHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await createPatientCondition(actor, patientFhirId, req.body);
  res.status(201).json(jsend.success(result));
};

export const updatePatientConditionStatusHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const conditionId = String(req.params.id ?? "");
  const nextStatus = String(req.body?.status ?? "") as UpdatableConditionStatus;
  const result = await changePatientConditionStatus(
    actor,
    patientFhirId,
    conditionId,
    nextStatus,
  );
  res.json(jsend.success(result));
};

export const deletePatientConditionHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const conditionId = String(req.params.id ?? "");
  const result = await removePatientCondition(
    actor,
    patientFhirId,
    conditionId,
  );
  res.json(jsend.success(result));
};

export const listPatientAllergiesHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await listPatientAllergies(actor, patientFhirId);
  res.json(jsend.success(result));
};

export const getPatientAllergyHandler = async (req: Request, res: Response) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const allergyId = String(req.params.id ?? "");
  const result = await getPatientAllergy(actor, patientFhirId, allergyId);
  res.json(jsend.success(result));
};

export const createPatientAllergyHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await createPatientAllergy(actor, patientFhirId, req.body);
  res.status(201).json(jsend.success(result));
};

export const updatePatientAllergyStatusHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const allergyId = String(req.params.id ?? "");
  const nextStatus = String(req.body?.status ?? "") as UpdatableAllergyStatus;
  const result = await changePatientAllergyStatus(
    actor,
    patientFhirId,
    allergyId,
    nextStatus,
  );
  res.json(jsend.success(result));
};

export const deletePatientAllergyHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalRecordActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const allergyId = String(req.params.id ?? "");
  const result = await removePatientAllergy(actor, patientFhirId, allergyId);
  res.json(jsend.success(result));
};
