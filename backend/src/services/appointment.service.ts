import type {
  AppointmentLifecycleStatus,
  AppointmentStatus,
  CreateAppointmentRequestInput,
  UpdateAppointmentDecisionInput,
} from "@fhir-mern/shared";
import type { AssignmentRole } from "../models/assignment.model.js";
import { findActiveAssignment } from "../repositories/assignment.repository.js";
import {
  createAppointment,
  getAppointmentById,
  getAppointmentsByPatient,
  updateAppointment,
} from "../repositories/appointment.repository.js";
import { createResponseAndSyncAppointmentStatus } from "../repositories/appointment-response.repository.js";
import { findUserById } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";
import {
  createAppointmentRequestSchema,
  fhirIdSchema,
  updateAppointmentDecisionSchema,
} from "../validators/appointment.validator.js";

export type ClinicalAppointmentActorRole = "admin" | "practitioner";

interface ClinicalAppointmentActor {
  userId: string;
  role: ClinicalAppointmentActorRole;
  name?: string;
}

interface PortalAppointmentActor {
  userId: string;
  patientFhirId: string;
  name?: string;
}

const ensureFhirId = (value: string, label: string): string => {
  const parsed = fhirIdSchema.safeParse(String(value ?? "").trim());
  if (!parsed.success) {
    throw new AppError(`${label}: ${parsed.error.issues[0]?.message}`, 400);
  }
  return parsed.data;
};

const toLifecycleStatus = (
  appointment: Record<string, unknown>,
): AppointmentLifecycleStatus => {
  const rawStatus = appointment["status"];
  const status = typeof rawStatus === "string" ? rawStatus : "";
  if (status === "booked" || status === "arrived" || status === "fulfilled") {
    return "confirmed";
  }
  if (status === "cancelled") {
    const cancelationReason = appointment["cancelationReason"];
    const reasonText =
      cancelationReason && typeof cancelationReason === "object"
        ? (cancelationReason as { text?: unknown }).text
        : undefined;
    if (
      typeof reasonText === "string" &&
      reasonText.toLowerCase().includes("declin")
    ) {
      return "declined";
    }
    return "cancelled";
  }
  if (status === "noshow" || status === "entered-in-error") {
    return "cancelled";
  }
  return "requested";
};

const extractPatientIdFromAppointment = (
  resource: Record<string, unknown>,
): string | null => {
  const participant = Array.isArray(resource["participant"])
    ? (resource["participant"] as Array<Record<string, unknown>>)
    : [];

  for (const part of participant) {
    const actor = part["actor"];
    const reference =
      actor && typeof actor === "object"
        ? (actor as { reference?: unknown }).reference
        : undefined;
    if (typeof reference !== "string") continue;
    const segments = reference.split("/");
    if (segments.length < 2) continue;
    const resourceType = segments[segments.length - 2];
    const id = segments[segments.length - 1];
    if (resourceType === "Patient" && id) {
      return id;
    }
  }

  return null;
};

const assertAppointmentBelongsToPatient = (
  appointment: Record<string, unknown>,
  patientFhirId: string,
): void => {
  const ownerId = extractPatientIdFromAppointment(appointment);
  if (!ownerId || ownerId !== patientFhirId) {
    throw new AppError("Appointment not found for this patient", 404);
  }
};

const assertChronologicalAndFuture = (start: string, end: string): void => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    throw new AppError("Invalid appointment date/time", 400);
  }
  if (endTime <= startTime) {
    throw new AppError("Appointment end must be after start", 400);
  }
  if (startTime <= Date.now()) {
    throw new AppError("Appointment start must be in the future", 400);
  }
};

const resolveAssignmentForPractitioner = async (
  patientFhirId: string,
  practitionerUserId: string,
): Promise<AssignmentRole> => {
  const assignment = await findActiveAssignment(
    patientFhirId,
    practitionerUserId,
  );
  if (!assignment) {
    throw new AppError(
      "Access denied. No active assignment found for this patient.",
      403,
    );
  }
  return assignment.assignmentRole;
};

const assertClinicalReadAccess = async (
  actor: ClinicalAppointmentActor,
  patientFhirId: string,
): Promise<void> => {
  if (actor.role === "admin") return;
  await resolveAssignmentForPractitioner(patientFhirId, actor.userId);
};

const assertClinicalWriteAccess = async (
  actor: ClinicalAppointmentActor,
  patientFhirId: string,
): Promise<void> => {
  if (actor.role === "admin") return;
  const role = await resolveAssignmentForPractitioner(
    patientFhirId,
    actor.userId,
  );
  if (role === "consulting") {
    throw new AppError(
      "Consulting assignments are read-only for appointments.",
      403,
    );
  }
};

const assertCareTeamTarget = async (
  patientFhirId: string,
  careTeamUserId: string,
): Promise<void> => {
  const user = await findUserById(careTeamUserId);
  if (!user) {
    throw new AppError("Care-team practitioner not found", 404);
  }
  if (user.role !== "practitioner") {
    throw new AppError("careTeamUserId must reference a practitioner", 403);
  }

  const assignment = await findActiveAssignment(patientFhirId, careTeamUserId);
  if (!assignment) {
    throw new AppError(
      "Target practitioner is not actively assigned to this patient",
      403,
    );
  }
};

const createAppointmentForPatient = async (
  patientFhirId: string,
  input: CreateAppointmentRequestInput,
): Promise<Record<string, unknown>> => {
  const parsed = createAppointmentRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      parsed.error.issues[0]?.message ?? "Invalid appointment payload",
      400,
    );
  }

  assertChronologicalAndFuture(parsed.data.start, parsed.data.end);
  await assertCareTeamTarget(patientFhirId, parsed.data.careTeamUserId);

  return createAppointment(patientFhirId, parsed.data.careTeamUserId, {
    start: parsed.data.start,
    end: parsed.data.end,
    status: "pending",
    patientParticipantStatus: "accepted",
    practitionerParticipantStatus: "needs-action",
    ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
    ...(parsed.data.note !== undefined ? { comment: parsed.data.note } : {}),
  });
};

const assertDecisionTransitionAllowed = (
  current: AppointmentLifecycleStatus,
  next: UpdateAppointmentDecisionInput["status"],
): void => {
  if (
    next === "cancelled" &&
    (current === "requested" || current === "confirmed")
  ) {
    return;
  }
  if (
    (next === "confirmed" || next === "declined") &&
    current === "requested"
  ) {
    return;
  }
  throw new AppError(
    `Invalid appointment transition: ${current} -> ${next}`,
    400,
  );
};

const applyDecision = async (
  appointmentId: string,
  participantReference: string,
  actorDisplay: string | undefined,
  decision: UpdateAppointmentDecisionInput,
): Promise<Record<string, unknown>> => {
  if (decision.status === "confirmed") {
    const out = await createResponseAndSyncAppointmentStatus(
      appointmentId,
      participantReference,
      {
        participantStatus: "accepted",
        ...(decision.comment !== undefined
          ? { comment: decision.comment }
          : {}),
        ...(actorDisplay !== undefined ? { actorDisplay } : {}),
      },
    );
    return out.appointment;
  }

  const out = await createResponseAndSyncAppointmentStatus(
    appointmentId,
    participantReference,
    {
      participantStatus: "declined",
      ...(decision.comment !== undefined ? { comment: decision.comment } : {}),
      ...(actorDisplay !== undefined ? { actorDisplay } : {}),
    },
  );

  const cancellationReasonText =
    decision.status === "declined" ? "declined" : "cancelled";
  return updateAppointment(
    appointmentId,
    {
      status: "cancelled" as AppointmentStatus,
      cancellationReasonText,
      ...(decision.comment ? { comment: decision.comment } : {}),
    },
    "cancelled",
  );
};

export const listClinicalPatientAppointments = async (
  actor: ClinicalAppointmentActor,
  patientFhirId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  await assertClinicalReadAccess(actor, normalizedPatientId);
  return getAppointmentsByPatient(normalizedPatientId);
};

export const createClinicalPatientAppointment = async (
  actor: ClinicalAppointmentActor,
  patientFhirId: string,
  input: CreateAppointmentRequestInput,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  await assertClinicalWriteAccess(actor, normalizedPatientId);
  return createAppointmentForPatient(normalizedPatientId, input);
};

export const getClinicalPatientAppointmentById = async (
  actor: ClinicalAppointmentActor,
  patientFhirId: string,
  appointmentId: string,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedAppointmentId = ensureFhirId(appointmentId, "appointmentId");
  await assertClinicalReadAccess(actor, normalizedPatientId);

  const appointment = await getAppointmentById(normalizedAppointmentId);
  assertAppointmentBelongsToPatient(appointment, normalizedPatientId);
  return appointment;
};

export const decideClinicalPatientAppointment = async (
  actor: ClinicalAppointmentActor,
  patientFhirId: string,
  appointmentId: string,
  input: UpdateAppointmentDecisionInput,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(patientFhirId, "patientFhirId");
  const normalizedAppointmentId = ensureFhirId(appointmentId, "appointmentId");
  const parsed = updateAppointmentDecisionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      parsed.error.issues[0]?.message ?? "Invalid appointment decision payload",
      400,
    );
  }

  await assertClinicalWriteAccess(actor, normalizedPatientId);

  const appointment = await getAppointmentById(normalizedAppointmentId);
  assertAppointmentBelongsToPatient(appointment, normalizedPatientId);
  const current = toLifecycleStatus(appointment);
  assertDecisionTransitionAllowed(current, parsed.data.status);

  return applyDecision(
    normalizedAppointmentId,
    `Practitioner/${actor.userId}`,
    actor.name,
    {
      status: parsed.data.status,
      ...(parsed.data.comment !== undefined
        ? { comment: parsed.data.comment }
        : {}),
    },
  );
};

export const listPortalAppointments = async (
  actor: PortalAppointmentActor,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(
    actor.patientFhirId,
    "patientFhirId",
  );
  return getAppointmentsByPatient(normalizedPatientId);
};

export const createPortalAppointment = async (
  actor: PortalAppointmentActor,
  input: CreateAppointmentRequestInput,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(
    actor.patientFhirId,
    "patientFhirId",
  );
  return createAppointmentForPatient(normalizedPatientId, input);
};

export const cancelPortalAppointment = async (
  actor: PortalAppointmentActor,
  appointmentId: string,
  input: Pick<UpdateAppointmentDecisionInput, "comment">,
): Promise<Record<string, unknown>> => {
  const normalizedPatientId = ensureFhirId(
    actor.patientFhirId,
    "patientFhirId",
  );
  const normalizedAppointmentId = ensureFhirId(appointmentId, "appointmentId");

  const appointment = await getAppointmentById(normalizedAppointmentId);
  assertAppointmentBelongsToPatient(appointment, normalizedPatientId);
  const current = toLifecycleStatus(appointment);
  assertDecisionTransitionAllowed(current, "cancelled");

  return applyDecision(
    normalizedAppointmentId,
    `Patient/${normalizedPatientId}`,
    actor.name,
    {
      status: "cancelled",
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
    },
  );
};
