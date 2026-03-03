import type { AssignmentRole } from "../models/assignment.model.js";
import { findActiveAssignment } from "../repositories/assignment.repository.js";
import {
  createCondition,
  deleteCondition,
  getConditionById,
  getConditionsByPatient,
  getConditionStatus,
  updateConditionStatus,
} from "../repositories/condition.repository.js";
import {
  createAllergyIntolerance,
  deleteAllergyIntolerance,
  getAllergiesByPatient,
  getAllergyIntoleranceById,
  getAllergyStatus,
  updateAllergyStatus,
} from "../repositories/allergy-intolerance.repository.js";
import { findUserById } from "../repositories/user.repository.js";
import type {
  AllergyStatus,
  ConditionStatus,
  CreateAllergyInput,
  CreateConditionInput,
  UpdatableAllergyStatus,
  UpdatableConditionStatus,
} from "@fhir-mern/shared";
import {
  createAllergySchema,
  createConditionSchema,
  fhirIdSchema,
  updateAllergyStatusSchema,
  updateConditionStatusSchema,
} from "../validators/conditions-allergies.validator.js";
import { AppError } from "../utils/AppError.js";

export type ClinicalRecordActorRole = "admin" | "practitioner";

interface ClinicalRecordActor {
  userId: string;
  role: ClinicalRecordActorRole;
}

const ensureFhirId = (value: string, label: string): string => {
  const parsed = fhirIdSchema.safeParse(String(value ?? "").trim());
  if (!parsed.success) {
    throw new AppError(`${label}: ${parsed.error.issues[0]?.message}`, 400);
  }
  return parsed.data;
};

const resolveAssignmentForPractitioner = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
): Promise<AssignmentRole> => {
  const assignment = await findActiveAssignment(patientFhirId, actor.userId);
  if (!assignment) {
    throw new AppError(
      "Access denied. No active assignment found for this patient.",
      403,
    );
  }
  return assignment.assignmentRole;
};

const assertReadAccess = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
): Promise<void> => {
  if (actor.role === "admin") return;
  await resolveAssignmentForPractitioner(actor, patientFhirId);
};

const assertWriteAccess = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
): Promise<void> => {
  if (actor.role === "admin") return;

  const assignmentRole = await resolveAssignmentForPractitioner(
    actor,
    patientFhirId,
  );
  if (assignmentRole === "consulting") {
    throw new AppError(
      "Consulting assignments are read-only for conditions and allergies.",
      403,
    );
  }
};

const resolvePractitionerFhirIdForCreate = async (
  actor: ClinicalRecordActor,
): Promise<string | undefined> => {
  if (actor.role !== "practitioner") return undefined;

  const user = await findUserById(actor.userId);
  const practitionerFhirId = user?.fhirPractitionerId?.trim();
  if (!practitionerFhirId) {
    throw new AppError(
      "Practitioner user is not linked to a FHIR Practitioner resource",
      409,
    );
  }
  return practitionerFhirId;
};

const extractPatientIdFromCondition = (
  resource: Record<string, unknown>,
): string | null => {
  const subject = resource["subject"];
  const reference =
    subject && typeof subject === "object"
      ? (subject as { reference?: unknown }).reference
      : undefined;

  if (typeof reference !== "string") return null;
  const parts = reference.split("/");
  if (parts.length < 2) return null;
  const type = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  if (type !== "Patient" || !id) return null;
  return id;
};

const extractPatientIdFromAllergy = (
  resource: Record<string, unknown>,
): string | null => {
  const patient = resource["patient"];
  const reference =
    patient && typeof patient === "object"
      ? (patient as { reference?: unknown }).reference
      : undefined;

  if (typeof reference !== "string") return null;
  const parts = reference.split("/");
  if (parts.length < 2) return null;
  const type = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  if (type !== "Patient" || !id) return null;
  return id;
};

const assertConditionOwnership = (
  resource: Record<string, unknown>,
  patientFhirId: string,
): void => {
  const ownerId = extractPatientIdFromCondition(resource);
  if (!ownerId || ownerId !== patientFhirId) {
    throw new AppError("Condition not found for this patient", 404);
  }
};

const assertAllergyOwnership = (
  resource: Record<string, unknown>,
  patientFhirId: string,
): void => {
  const ownerId = extractPatientIdFromAllergy(resource);
  if (!ownerId || ownerId !== patientFhirId) {
    throw new AppError("AllergyIntolerance not found for this patient", 404);
  }
};

const assertConditionTransition = (
  currentStatus: ConditionStatus,
  nextStatus: UpdatableConditionStatus,
): void => {
  const allowed: Record<
    ConditionStatus,
    ReadonlySet<UpdatableConditionStatus>
  > = {
    active: new Set(["inactive", "resolved", "entered-in-error"]),
    inactive: new Set(["resolved", "entered-in-error"]),
    resolved: new Set(["entered-in-error"]),
    "entered-in-error": new Set(),
    unknown: new Set(),
  };

  if (!allowed[currentStatus]?.has(nextStatus)) {
    throw new AppError(
      `Invalid Condition status transition: ${currentStatus} -> ${nextStatus}`,
      400,
    );
  }
};

const assertAllergyTransition = (
  currentStatus: AllergyStatus,
  nextStatus: UpdatableAllergyStatus,
): void => {
  const allowed: Record<AllergyStatus, ReadonlySet<UpdatableAllergyStatus>> = {
    active: new Set(["inactive", "resolved", "entered-in-error"]),
    inactive: new Set(["resolved", "entered-in-error"]),
    resolved: new Set(["entered-in-error"]),
    "entered-in-error": new Set(),
    unknown: new Set(),
  };

  if (!allowed[currentStatus]?.has(nextStatus)) {
    throw new AppError(
      `Invalid AllergyIntolerance status transition: ${currentStatus} -> ${nextStatus}`,
      400,
    );
  }
};

export const listPatientConditions = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  await assertReadAccess(actor, normalizedPatientId);
  return getConditionsByPatient(normalizedPatientId);
};

export const getPatientCondition = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  conditionId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedConditionId = ensureFhirId(conditionId, "conditionId");
  await assertReadAccess(actor, normalizedPatientId);
  const condition = await getConditionById(normalizedConditionId);
  assertConditionOwnership(condition, normalizedPatientId);
  return condition;
};

export const createPatientCondition = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  input: CreateConditionInput,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const body = createConditionSchema.safeParse(input);
  if (!body.success) {
    throw new AppError(
      body.error.issues[0]?.message ?? "Invalid condition payload",
      400,
    );
  }
  await assertWriteAccess(actor, normalizedPatientId);
  const practitionerFhirId = await resolvePractitionerFhirIdForCreate(actor);
  return createCondition(normalizedPatientId, practitionerFhirId, {
    diagnosis: body.data.diagnosis,
    recordedDate: body.data.recordedDate,
    ...(body.data.snomedCode !== undefined
      ? { snomedCode: body.data.snomedCode }
      : {}),
    ...(body.data.note !== undefined ? { note: body.data.note } : {}),
    ...(body.data.clinicalStatus !== undefined
      ? { clinicalStatus: body.data.clinicalStatus }
      : {}),
  });
};

export const changePatientConditionStatus = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  conditionId: string,
  nextStatus: UpdatableConditionStatus,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedConditionId = ensureFhirId(conditionId, "conditionId");
  const statusBody = updateConditionStatusSchema.safeParse({
    status: nextStatus,
  });
  if (!statusBody.success) {
    throw new AppError(
      statusBody.error.issues[0]?.message ?? "Invalid condition status update",
      400,
    );
  }

  await assertWriteAccess(actor, normalizedPatientId);
  const existing = await getConditionById(normalizedConditionId);
  assertConditionOwnership(existing, normalizedPatientId);
  const currentStatus = getConditionStatus(existing);
  assertConditionTransition(currentStatus, statusBody.data.status);

  return updateConditionStatus(
    normalizedConditionId,
    statusBody.data.status,
    currentStatus,
  );
};

export const removePatientCondition = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  conditionId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedConditionId = ensureFhirId(conditionId, "conditionId");

  await assertWriteAccess(actor, normalizedPatientId);
  const existing = await getConditionById(normalizedConditionId);
  assertConditionOwnership(existing, normalizedPatientId);
  await deleteCondition(normalizedConditionId);
  return { id: normalizedConditionId, deleted: true };
};

export const listPatientAllergies = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  await assertReadAccess(actor, normalizedPatientId);
  return getAllergiesByPatient(normalizedPatientId);
};

export const getPatientAllergy = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  allergyId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedAllergyId = ensureFhirId(allergyId, "allergyId");
  await assertReadAccess(actor, normalizedPatientId);
  const allergy = await getAllergyIntoleranceById(normalizedAllergyId);
  assertAllergyOwnership(allergy, normalizedPatientId);
  return allergy;
};

export const createPatientAllergy = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  input: CreateAllergyInput,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const body = createAllergySchema.safeParse(input);
  if (!body.success) {
    throw new AppError(
      body.error.issues[0]?.message ?? "Invalid allergy payload",
      400,
    );
  }
  await assertWriteAccess(actor, normalizedPatientId);
  const practitionerFhirId = await resolvePractitionerFhirIdForCreate(actor);
  return createAllergyIntolerance(normalizedPatientId, practitionerFhirId, {
    substance: body.data.substance,
    recordedDate: body.data.recordedDate,
    ...(body.data.snomedCode !== undefined
      ? { snomedCode: body.data.snomedCode }
      : {}),
    ...(body.data.note !== undefined ? { note: body.data.note } : {}),
    ...(body.data.reaction !== undefined
      ? { reaction: body.data.reaction }
      : {}),
    ...(body.data.criticality !== undefined
      ? { criticality: body.data.criticality }
      : {}),
    ...(body.data.clinicalStatus !== undefined
      ? { clinicalStatus: body.data.clinicalStatus }
      : {}),
  });
};

export const changePatientAllergyStatus = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  allergyId: string,
  nextStatus: UpdatableAllergyStatus,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedAllergyId = ensureFhirId(allergyId, "allergyId");
  const statusBody = updateAllergyStatusSchema.safeParse({
    status: nextStatus,
  });
  if (!statusBody.success) {
    throw new AppError(
      statusBody.error.issues[0]?.message ?? "Invalid allergy status update",
      400,
    );
  }

  await assertWriteAccess(actor, normalizedPatientId);
  const existing = await getAllergyIntoleranceById(normalizedAllergyId);
  assertAllergyOwnership(existing, normalizedPatientId);
  const currentStatus = getAllergyStatus(existing);
  assertAllergyTransition(currentStatus, statusBody.data.status);

  return updateAllergyStatus(
    normalizedAllergyId,
    statusBody.data.status,
    currentStatus,
  );
};

export const removePatientAllergy = async (
  actor: ClinicalRecordActor,
  patientFhirId: string,
  allergyId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedAllergyId = ensureFhirId(allergyId, "allergyId");

  await assertWriteAccess(actor, normalizedPatientId);
  const existing = await getAllergyIntoleranceById(normalizedAllergyId);
  assertAllergyOwnership(existing, normalizedPatientId);
  await deleteAllergyIntolerance(normalizedAllergyId);
  return { id: normalizedAllergyId, deleted: true };
};
