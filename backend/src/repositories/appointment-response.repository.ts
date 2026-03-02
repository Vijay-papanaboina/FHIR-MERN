import { fhirBaseUrl, fhirGet, fhirPost } from "./fhir.client.js";
import type {
  AppointmentParticipantStatus,
  AppointmentStatus,
  CreateAppointmentResponseInput,
} from "@fhir-mern/shared";
import {
  getAppointmentById,
  updateAppointment,
} from "./appointment.repository.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const APPOINTMENT_STATUS_SET: ReadonlySet<AppointmentStatus> = new Set([
  "proposed",
  "pending",
  "booked",
  "arrived",
  "fulfilled",
  "cancelled",
  "noshow",
  "entered-in-error",
  "checked-in",
  "waitlist",
]);

const extractParticipantStatuses = (
  bundle: Record<string, unknown>,
): AppointmentParticipantStatus[] => {
  const entry = Array.isArray(bundle["entry"])
    ? (bundle["entry"] as Array<{ resource?: unknown }>)
    : [];

  return entry
    .map((item) => item.resource)
    .filter(
      (resource): resource is Record<string, unknown> =>
        !!resource &&
        typeof resource === "object" &&
        (resource as { resourceType?: unknown }).resourceType ===
          "AppointmentResponse",
    )
    .map((resource) => resource["participantStatus"])
    .filter(
      (status): status is AppointmentParticipantStatus =>
        status === "accepted" ||
        status === "declined" ||
        status === "tentative" ||
        status === "needs-action",
    );
};

export const deriveAppointmentStatusFromResponses = (
  statuses: AppointmentParticipantStatus[],
): AppointmentStatus => {
  if (statuses.some((status) => status === "declined")) {
    return "cancelled";
  }

  if (
    statuses.length > 0 &&
    statuses.every((status) => status === "accepted")
  ) {
    return "booked";
  }

  return "pending";
};

const buildAppointmentResponseResource = (
  appointmentId: string,
  participantReference: string,
  input: CreateAppointmentResponseInput,
): Record<string, unknown> => {
  const trimmedAppointmentId = appointmentId.trim();
  const trimmedParticipantReference = participantReference.trim();
  if (!trimmedAppointmentId) {
    throw new AppError("Invalid appointmentId for AppointmentResponse", 400);
  }
  if (!trimmedParticipantReference) {
    throw new AppError(
      "Invalid participantReference for AppointmentResponse",
      400,
    );
  }

  return {
    resourceType: "AppointmentResponse",
    appointment: {
      reference: `Appointment/${trimmedAppointmentId}`,
    },
    actor: {
      reference: trimmedParticipantReference,
      ...(input.actorDisplay?.trim()
        ? { display: input.actorDisplay.trim() }
        : {}),
    },
    participantStatus: input.participantStatus,
    ...(input.comment?.trim() ? { comment: input.comment.trim() } : {}),
  };
};

export const createAppointmentResponse = async (
  appointmentId: string,
  participantReference: string,
  data: CreateAppointmentResponseInput,
): Promise<Record<string, unknown>> => {
  const resource = buildAppointmentResponseResource(
    appointmentId,
    participantReference,
    data,
  );

  return fhirPost(`${fhirBaseUrl()}/AppointmentResponse`, resource);
};

export const getResponsesByAppointment = async (
  appointmentId: string,
): Promise<Record<string, unknown>> => {
  const trimmedAppointmentId = appointmentId.trim();
  if (!trimmedAppointmentId) {
    throw new AppError(
      "appointmentId is required for AppointmentResponse lookup",
      400,
    );
  }

  const query = new URLSearchParams({
    appointment: `Appointment/${trimmedAppointmentId}`,
    _sort: "-_lastUpdated",
  });

  return fhirGet(`${fhirBaseUrl()}/AppointmentResponse?${query.toString()}`);
};

export const syncAppointmentStatusFromResponses = async (
  appointmentId: string,
): Promise<Record<string, unknown>> => {
  const trimmedId = appointmentId.trim();
  const appointment = await getAppointmentById(trimmedId);
  const bundle = await getResponsesByAppointment(trimmedId);
  const statuses = extractParticipantStatuses(bundle);
  const nextStatus = deriveAppointmentStatusFromResponses(statuses);

  const currentStatus = appointment["status"];
  if (typeof currentStatus === "string" && currentStatus === nextStatus) {
    return appointment;
  }
  if (
    typeof currentStatus !== "string" ||
    !APPOINTMENT_STATUS_SET.has(currentStatus as AppointmentStatus)
  ) {
    throw new AppError(
      `Appointment status is missing or invalid for sync: ${String(currentStatus)}`,
      502,
    );
  }

  return updateAppointment(
    trimmedId,
    { status: nextStatus },
    currentStatus as AppointmentStatus,
  );
};

export const createResponseAndSyncAppointmentStatus = async (
  appointmentId: string,
  participantReference: string,
  data: CreateAppointmentResponseInput,
): Promise<{
  response: Record<string, unknown>;
  appointment: Record<string, unknown>;
}> => {
  const trimmedAppointmentId = appointmentId.trim();
  const trimmedParticipantReference = participantReference.trim();
  const response = await createAppointmentResponse(
    trimmedAppointmentId,
    trimmedParticipantReference,
    data,
  );

  const maxAttempts = 3;
  let appointment: Record<string, unknown> | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      appointment =
        await syncAppointmentStatusFromResponses(trimmedAppointmentId);
      break;
    } catch (error) {
      lastError = error;
      logger.warn("AppointmentResponse sync attempt failed", {
        appointmentId: trimmedAppointmentId,
        participantReference: trimmedParticipantReference,
        attempt,
        maxAttempts,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt < maxAttempts) {
        await new Promise((resolve) => {
          setTimeout(resolve, attempt * 100);
        });
      }
    }
  }

  if (!appointment) {
    throw new AppError(
      `AppointmentResponse created but failed to sync Appointment status after ${maxAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
      502,
    );
  }

  return { response, appointment };
};
