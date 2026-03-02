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

const UPDATABLE_CONDITION_STATUSES = new Set<UpdatableConditionStatus>([
  "inactive",
  "resolved",
  "entered-in-error",
]);

const UPDATABLE_ALLERGY_STATUSES = new Set<UpdatableAllergyStatus>([
  "inactive",
  "resolved",
  "entered-in-error",
]);

const isUpdatableConditionStatus = (
  value: string,
): value is UpdatableConditionStatus => {
  return UPDATABLE_CONDITION_STATUSES.has(value as UpdatableConditionStatus);
};

const isUpdatableAllergyStatus = (
  value: string,
): value is UpdatableAllergyStatus => {
  return UPDATABLE_ALLERGY_STATUSES.has(value as UpdatableAllergyStatus);
};

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
  const nextStatusRaw = String(req.body?.status ?? "");
  if (!isUpdatableConditionStatus(nextStatusRaw)) {
    throw new AppError(
      "status must be one of: inactive, resolved, entered-in-error",
      400,
    );
  }
  const nextStatus = nextStatusRaw;
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
  const nextStatusRaw = String(req.body?.status ?? "");
  if (!isUpdatableAllergyStatus(nextStatusRaw)) {
    throw new AppError(
      "status must be one of: inactive, resolved, entered-in-error",
      400,
    );
  }
  const nextStatus = nextStatusRaw;
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
