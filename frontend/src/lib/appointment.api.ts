import type {
  AppointmentDTO,
  AppointmentLifecycleStatus,
  AppointmentParticipantStatus,
  AppointmentStatus,
  CreateAppointmentRequestInput,
  UpdateAppointmentDecisionInput,
} from "@fhir-mern/shared";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

interface FhirBundleEntry {
  resource?: unknown;
}

interface FhirBundle {
  resourceType?: string;
  entry?: FhirBundleEntry[];
}

interface AppointmentParticipant {
  status?: unknown;
  actor?: {
    reference?: unknown;
    display?: unknown;
  };
}

interface AppointmentReason {
  text?: unknown;
}

interface AppointmentResource {
  resourceType?: unknown;
  id?: unknown;
  status?: unknown;
  start?: unknown;
  end?: unknown;
  description?: unknown;
  comment?: unknown;
  participant?: unknown;
  reasonCode?: unknown;
  cancelationReason?: {
    text?: unknown;
  };
}

const PATIENT_APPOINTMENT_BASE_PATH = "/api/patients";
const PORTAL_APPOINTMENT_BASE_PATH = "/api/portal/appointments";

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

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asAppointmentStatus(value: unknown): AppointmentStatus {
  if (typeof value !== "string") return "pending";
  return APPOINTMENT_STATUS_SET.has(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : "pending";
}

function asParticipantStatus(
  value: unknown,
): AppointmentParticipantStatus | null {
  if (
    value === "accepted" ||
    value === "declined" ||
    value === "tentative" ||
    value === "needs-action"
  ) {
    return value;
  }
  return null;
}

function toLifecycleStatus(
  status: AppointmentStatus,
  cancellationReason: string | null,
): AppointmentLifecycleStatus {
  if (status === "booked" || status === "arrived" || status === "fulfilled") {
    return "confirmed";
  }
  if (status === "cancelled") {
    const normalizedReason = cancellationReason
      ?.toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const declinedReasonSet = new Set([
      "declined",
      "patient declined",
      "client declined",
      "decline by patient",
      "declined by patient",
      "declined by client",
    ]);
    if (normalizedReason && declinedReasonSet.has(normalizedReason)) {
      return "declined";
    }
    return "cancelled";
  }
  if (status === "noshow" || status === "entered-in-error") {
    return "cancelled";
  }
  return "requested";
}

function parseParticipants(resource: AppointmentResource): {
  patientReference: string | null;
  patientParticipantStatus: AppointmentParticipantStatus | null;
  practitionerReference: string | null;
  practitionerParticipantStatus: AppointmentParticipantStatus | null;
  practitionerDisplay: string | null;
  careTeamUserId: string | null;
} {
  const participants = Array.isArray(resource.participant)
    ? (resource.participant as AppointmentParticipant[])
    : [];

  let patientReference: string | null = null;
  let patientParticipantStatus: AppointmentParticipantStatus | null = null;
  let practitionerReference: string | null = null;
  let practitionerParticipantStatus: AppointmentParticipantStatus | null = null;
  let practitionerDisplay: string | null = null;
  let careTeamUserId: string | null = null;

  for (const participant of participants) {
    const reference = asStringOrNull(participant.actor?.reference);
    const display = asStringOrNull(participant.actor?.display);
    const participantStatus = asParticipantStatus(participant.status);

    if (!reference) continue;

    if (reference.startsWith("Patient/")) {
      patientReference = reference;
      patientParticipantStatus = participantStatus;
      continue;
    }

    if (reference.startsWith("Practitioner/")) {
      practitionerReference = reference;
      practitionerParticipantStatus = participantStatus;
      practitionerDisplay = display;
      const id = reference.split("/")[1]?.trim();
      if (id) careTeamUserId = id;
    }
  }

  return {
    patientReference,
    patientParticipantStatus,
    practitionerReference,
    practitionerParticipantStatus,
    practitionerDisplay,
    careTeamUserId,
  };
}

function extractReason(resource: AppointmentResource): string | null {
  const reasonCode = Array.isArray(resource.reasonCode)
    ? (resource.reasonCode as AppointmentReason[])
    : [];
  return asStringOrNull(reasonCode[0]?.text);
}

export function mapAppointmentResource(
  resource: AppointmentResource,
): AppointmentDTO | null {
  const id = asStringOrNull(resource.id);
  if (!id) {
    console.warn("Skipping Appointment without id", resource);
    return null;
  }

  const status = asAppointmentStatus(resource.status);
  const cancellationReason = asStringOrNull(resource.cancelationReason?.text);
  const participantData = parseParticipants(resource);

  return {
    id,
    status,
    lifecycleStatus: toLifecycleStatus(status, cancellationReason),
    start: asStringOrNull(resource.start),
    end: asStringOrNull(resource.end),
    reason: extractReason(resource),
    note:
      asStringOrNull(resource.comment) ?? asStringOrNull(resource.description),
    cancellationReason,
    ...participantData,
  };
}

export function mapAppointmentBundle(bundle: unknown): AppointmentDTO[] {
  if (!bundle || typeof bundle !== "object") return [];

  const typedBundle = bundle as FhirBundle;
  const entries = Array.isArray(typedBundle.entry) ? typedBundle.entry : [];

  return entries
    .map((entry) => entry.resource)
    .filter(
      (resource): resource is AppointmentResource =>
        !!resource &&
        typeof resource === "object" &&
        (resource as { resourceType?: unknown }).resourceType === "Appointment",
    )
    .map((resource) => mapAppointmentResource(resource))
    .filter(
      (resource): resource is AppointmentDTO =>
        !!resource && resource.id.length > 0,
    );
}

function normalizeCreateInput(
  input: CreateAppointmentRequestInput,
): CreateAppointmentRequestInput {
  const careTeamUserId = input.careTeamUserId.trim();
  const start = input.start.trim();
  const end = input.end.trim();
  const reason = input.reason?.trim();
  const note = input.note?.trim();

  if (!careTeamUserId) {
    throw new Error("careTeamUserId is required");
  }
  if (!start) {
    throw new Error("start is required");
  }
  if (!end) {
    throw new Error("end is required");
  }

  return {
    careTeamUserId,
    start,
    end,
    ...(reason ? { reason } : {}),
    ...(note ? { note } : {}),
  };
}

function normalizeDecisionInput(
  input: UpdateAppointmentDecisionInput,
): UpdateAppointmentDecisionInput {
  const status = input.status;
  if (
    status !== "confirmed" &&
    status !== "declined" &&
    status !== "cancelled"
  ) {
    throw new Error("status must be confirmed, declined, or cancelled");
  }

  const comment = input.comment?.trim();
  return {
    status,
    ...(comment ? { comment } : {}),
  };
}

function mapSingleAppointmentOrThrow(resource: unknown): AppointmentDTO {
  if (!resource || typeof resource !== "object") {
    throw new Error("Invalid appointment response");
  }
  const mapped = mapAppointmentResource(resource as AppointmentResource);
  if (!mapped) {
    throw new Error("Appointment response missing required id field");
  }
  return mapped;
}

export async function fetchPatientAppointments(
  patientFhirId: string,
): Promise<AppointmentDTO[]> {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    throw new Error("Patient ID is required");
  }
  const data = await apiGet<unknown>(
    `${PATIENT_APPOINTMENT_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/appointments`,
  );
  return mapAppointmentBundle(data);
}

export async function createPatientAppointment(
  patientFhirId: string,
  input: CreateAppointmentRequestInput,
): Promise<AppointmentDTO> {
  const trimmedPatientId = patientFhirId.trim();
  if (!trimmedPatientId) {
    throw new Error("Patient ID is required");
  }

  const payload = normalizeCreateInput(input);
  const data = await apiPost<unknown>(
    `${PATIENT_APPOINTMENT_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/appointments`,
    payload,
  );
  return mapSingleAppointmentOrThrow(data);
}

export async function decidePatientAppointment(
  patientFhirId: string,
  appointmentId: string,
  input: UpdateAppointmentDecisionInput,
): Promise<AppointmentDTO> {
  const trimmedPatientId = patientFhirId.trim();
  const trimmedAppointmentId = appointmentId.trim();
  if (!trimmedPatientId) {
    throw new Error("Patient ID is required");
  }
  if (!trimmedAppointmentId) {
    throw new Error("Appointment ID is required");
  }

  const payload = normalizeDecisionInput(input);
  const data = await apiPatch<unknown>(
    `${PATIENT_APPOINTMENT_BASE_PATH}/${encodeURIComponent(trimmedPatientId)}/appointments/${encodeURIComponent(trimmedAppointmentId)}`,
    payload,
  );
  return mapSingleAppointmentOrThrow(data);
}

export async function fetchPortalAppointments(): Promise<AppointmentDTO[]> {
  const data = await apiGet<unknown>(PORTAL_APPOINTMENT_BASE_PATH);
  return mapAppointmentBundle(data);
}

export async function createPortalAppointment(
  input: CreateAppointmentRequestInput,
): Promise<AppointmentDTO> {
  const payload = normalizeCreateInput(input);
  const data = await apiPost<unknown>(PORTAL_APPOINTMENT_BASE_PATH, payload);
  return mapSingleAppointmentOrThrow(data);
}

export async function cancelPortalAppointment(
  appointmentId: string,
  comment?: string,
): Promise<AppointmentDTO> {
  const trimmedAppointmentId = appointmentId.trim();
  if (!trimmedAppointmentId) {
    throw new Error("Appointment ID is required");
  }

  const trimmedComment = comment?.trim();
  const payload = trimmedComment ? { comment: trimmedComment } : undefined;
  const data = await apiPatch<unknown>(
    `${PORTAL_APPOINTMENT_BASE_PATH}/${encodeURIComponent(trimmedAppointmentId)}`,
    payload,
  );
  return mapSingleAppointmentOrThrow(data);
}
