import {
  fhirBaseUrl,
  fhirGet,
  fhirPost,
  fhirPutWithHeaders,
} from "./fhir.client.js";
import type {
  AppointmentParticipantStatus,
  AppointmentStatus,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@fhir-mern/shared";
import { AppError } from "../utils/AppError.js";

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

const normalizeDateTime = (value: string, fieldName: string): string => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw new AppError(`Invalid ${fieldName} provided for Appointment`, 400);
  }
  return dt.toISOString();
};

const assertEndAfterStart = (start: string, end: string): void => {
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    throw new AppError("Appointment end must be after start", 400);
  }
};

const buildParticipant = (
  reference: string,
  status: AppointmentParticipantStatus,
  display?: string,
): Record<string, unknown> => ({
  actor: {
    reference,
    ...(display?.trim() ? { display: display.trim() } : {}),
  },
  status,
});

const buildAppointmentResource = (
  patientFhirId: string,
  practitionerFhirId: string,
  input: CreateAppointmentInput,
): Record<string, unknown> => {
  const start = normalizeDateTime(input.start, "start");
  const end = normalizeDateTime(input.end, "end");
  assertEndAfterStart(start, end);

  return {
    resourceType: "Appointment",
    status: input.status ?? "pending",
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    ...(input.comment?.trim() ? { comment: input.comment.trim() } : {}),
    ...(input.reason?.trim()
      ? {
          reasonCode: [
            {
              text: input.reason.trim(),
            },
          ],
        }
      : {}),
    start,
    end,
    participant: [
      buildParticipant(
        `Patient/${patientFhirId.trim()}`,
        input.patientParticipantStatus ?? "accepted",
        input.patientDisplay,
      ),
      buildParticipant(
        `Practitioner/${practitionerFhirId.trim()}`,
        input.practitionerParticipantStatus ?? "needs-action",
        input.practitionerDisplay,
      ),
    ],
  };
};

const normalizeStatuses = (statuses?: AppointmentStatus[]): string | null => {
  if (!statuses || statuses.length === 0) return null;

  const deduped = [
    ...new Set(
      statuses
        .map((status) => String(status).trim() as AppointmentStatus)
        .filter((status): status is AppointmentStatus =>
          APPOINTMENT_STATUS_SET.has(status),
        ),
    ),
  ];

  return deduped.length > 0 ? deduped.join(",") : null;
};

const getVersionId = (resource: Record<string, unknown>): string => {
  const meta = resource["meta"];
  const versionId =
    meta && typeof meta === "object"
      ? (meta as { versionId?: unknown }).versionId
      : undefined;

  if (typeof versionId !== "string" || versionId.trim().length === 0) {
    throw new AppError(
      "Cannot update Appointment without meta.versionId for optimistic locking",
      502,
    );
  }

  return versionId.trim();
};

export const createAppointment = async (
  patientFhirId: string,
  practitionerFhirId: string,
  data: CreateAppointmentInput,
): Promise<Record<string, unknown>> => {
  const resource = buildAppointmentResource(
    patientFhirId,
    practitionerFhirId,
    data,
  );
  return fhirPost(`${fhirBaseUrl()}/Appointment`, resource);
};

export const getAppointmentById = async (
  id: string,
): Promise<Record<string, unknown>> =>
  fhirGet(`${fhirBaseUrl()}/Appointment/${encodeURIComponent(id.trim())}`);

export const getAppointmentsByPatient = async (
  patientFhirId: string,
  statuses?: AppointmentStatus[],
): Promise<Record<string, unknown>> => {
  const query = new URLSearchParams({
    patient: `Patient/${patientFhirId.trim()}`,
    _sort: "-date",
  });

  const statusFilter = normalizeStatuses(statuses);
  if (statusFilter) query.set("status", statusFilter);

  return fhirGet(`${fhirBaseUrl()}/Appointment?${query.toString()}`);
};

export const getAppointmentsByPractitioner = async (
  practitionerFhirId: string,
  statuses?: AppointmentStatus[],
): Promise<Record<string, unknown>> => {
  const query = new URLSearchParams({
    practitioner: `Practitioner/${practitionerFhirId.trim()}`,
    _sort: "-date",
  });

  const statusFilter = normalizeStatuses(statuses);
  if (statusFilter) query.set("status", statusFilter);

  return fhirGet(`${fhirBaseUrl()}/Appointment?${query.toString()}`);
};

export const updateAppointment = async (
  id: string,
  patch: UpdateAppointmentInput,
  expectedCurrentStatus?: AppointmentStatus,
): Promise<Record<string, unknown>> => {
  const trimmedId = id.trim();
  const existing = await getAppointmentById(trimmedId);

  const currentStatus = existing["status"];
  if (
    expectedCurrentStatus &&
    (typeof currentStatus !== "string" ||
      currentStatus !== expectedCurrentStatus)
  ) {
    throw new AppError(
      `Appointment status changed before update: expected ${expectedCurrentStatus}, got ${currentStatus}`,
      409,
    );
  }

  const normalizedStart = patch.start
    ? normalizeDateTime(patch.start, "start")
    : null;
  const normalizedEnd = patch.end ? normalizeDateTime(patch.end, "end") : null;

  if (normalizedStart && normalizedEnd) {
    assertEndAfterStart(normalizedStart, normalizedEnd);
  }

  const updated: Record<string, unknown> = {
    ...existing,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description }
      : {}),
    ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
    ...(patch.cancellationReasonText?.trim()
      ? {
          cancelationReason: {
            text: patch.cancellationReasonText.trim(),
          },
        }
      : {}),
    ...(normalizedStart ? { start: normalizedStart } : {}),
    ...(normalizedEnd ? { end: normalizedEnd } : {}),
  };

  const versionId = getVersionId(existing);

  return fhirPutWithHeaders(
    `${fhirBaseUrl()}/Appointment/${encodeURIComponent(trimmedId)}`,
    updated,
    { "If-Match": `W/"${versionId}"` },
  );
};
