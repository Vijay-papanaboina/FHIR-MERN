import type { AssignmentRole } from "../models/assignment.model.js";
import { findActiveAssignment } from "../repositories/assignment.repository.js";
import {
  createMedicationRequest,
  getMedicationRequestById,
  getMedicationRequestsByPatient,
  updateMedicationRequestStatus,
} from "../repositories/medication-request.repository.js";
import type { MedicationRequestStatus } from "../repositories/medication-request.repository.js";
import type {
  CreateMedicationInput,
  UpdatableMedicationStatus,
} from "../validators/medication.validator.js";
import {
  createMedicationSchema,
  fhirIdSchema,
  updateMedicationStatusSchema,
} from "../validators/medication.validator.js";
import { AppError } from "../utils/AppError.js";

export type MedicationActorRole = "admin" | "practitioner";

interface MedicationActor {
  userId: string;
  role: MedicationActorRole;
}

const ensureFhirId = (value: string, label: string): string => {
  const parsed = fhirIdSchema.safeParse(String(value ?? "").trim());
  if (!parsed.success) {
    throw new AppError(`${label}: ${parsed.error.issues[0]?.message}`, 400);
  }
  return parsed.data;
};

const extractPatientIdFromReference = (
  resource: Record<string, unknown>,
): string | null => {
  const subject = resource.subject as { reference?: string } | undefined;
  if (!subject?.reference) return null;

  const parts = subject.reference.split("/");
  if (parts.length < 2) return null;
  const resourceType = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  if (resourceType !== "Patient" || !id) return null;
  return id;
};

const getMedicationStatus = (
  resource: Record<string, unknown>,
): MedicationRequestStatus | null => {
  const status = resource.status;
  return typeof status === "string"
    ? (status as MedicationRequestStatus)
    : null;
};

const assertPatientOwnership = (
  resource: Record<string, unknown>,
  patientFhirId: string,
): void => {
  const ownerId = extractPatientIdFromReference(resource);
  if (!ownerId || ownerId !== patientFhirId) {
    throw new AppError("MedicationRequest not found for this patient", 404);
  }
};

const resolveAssignmentForPractitioner = async (
  actor: MedicationActor,
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
  actor: MedicationActor,
  patientFhirId: string,
): Promise<void> => {
  if (actor.role === "admin") return;
  await resolveAssignmentForPractitioner(actor, patientFhirId);
};

const assertWriteAccess = async (
  actor: MedicationActor,
  patientFhirId: string,
): Promise<void> => {
  if (actor.role === "admin") return;

  const assignmentRole = await resolveAssignmentForPractitioner(
    actor,
    patientFhirId,
  );
  if (assignmentRole === "consulting") {
    throw new AppError(
      "Consulting assignments are read-only for medications.",
      403,
    );
  }
};

export const listPatientMedicationRequests = async (
  actor: MedicationActor,
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  await assertReadAccess(actor, normalizedPatientId);
  return getMedicationRequestsByPatient(normalizedPatientId);
};

export const getPatientMedicationRequest = async (
  actor: MedicationActor,
  patientFhirId: string,
  medicationRequestId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedMedicationId = ensureFhirId(
    medicationRequestId,
    "medicationRequestId",
  );

  await assertReadAccess(actor, normalizedPatientId);
  const resource = await getMedicationRequestById(normalizedMedicationId);
  assertPatientOwnership(resource, normalizedPatientId);
  return resource;
};

export const prescribeMedication = async (
  actor: MedicationActor,
  patientFhirId: string,
  input: CreateMedicationInput,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const body = createMedicationSchema.safeParse(input);
  if (!body.success) {
    throw new AppError(
      body.error.issues[0]?.message ?? "Invalid medication payload",
      400,
    );
  }

  await assertWriteAccess(actor, normalizedPatientId);

  return createMedicationRequest(normalizedPatientId, actor.userId, {
    drugName: body.data.drugName,
    ...(body.data.rxNormCode !== undefined
      ? { rxNormCode: body.data.rxNormCode }
      : {}),
  });
};

export const changeMedicationStatus = async (
  actor: MedicationActor,
  patientFhirId: string,
  medicationRequestId: string,
  nextStatus: UpdatableMedicationStatus,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedMedicationId = ensureFhirId(
    medicationRequestId,
    "medicationRequestId",
  );
  const statusResult = updateMedicationStatusSchema.safeParse({
    status: nextStatus,
  });
  if (!statusResult.success) {
    throw new AppError(
      statusResult.error.issues[0]?.message ?? "Invalid status update",
      400,
    );
  }

  await assertWriteAccess(actor, normalizedPatientId);

  const existing = await getMedicationRequestById(normalizedMedicationId);
  assertPatientOwnership(existing, normalizedPatientId);

  const currentStatus = getMedicationStatus(existing);
  if (currentStatus !== "active") {
    throw new AppError(
      `Invalid status transition: ${currentStatus ?? "unknown"} -> ${statusResult.data.status}`,
      400,
    );
  }

  return updateMedicationRequestStatus(
    normalizedMedicationId,
    statusResult.data.status,
  );
};
