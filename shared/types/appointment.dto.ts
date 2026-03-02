export type AppointmentStatus =
  | "proposed"
  | "pending"
  | "booked"
  | "arrived"
  | "fulfilled"
  | "cancelled"
  | "noshow"
  | "entered-in-error"
  | "checked-in"
  | "waitlist";

export type AppointmentParticipantStatus =
  | "accepted"
  | "declined"
  | "tentative"
  | "needs-action";

export interface CreateAppointmentInput {
  start: string;
  end: string;
  description?: string;
  comment?: string;
  reason?: string;
  status?: AppointmentStatus;
  patientDisplay?: string;
  practitionerDisplay?: string;
  patientParticipantStatus?: AppointmentParticipantStatus;
  practitionerParticipantStatus?: AppointmentParticipantStatus;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus;
  description?: string;
  comment?: string;
  cancellationReasonText?: string;
  start?: string;
  end?: string;
}

export interface CreateAppointmentResponseInput {
  participantStatus: AppointmentParticipantStatus;
  comment?: string;
  actorDisplay?: string;
}

export type AppointmentLifecycleStatus =
  | "requested"
  | "confirmed"
  | "declined"
  | "cancelled";

export interface AppointmentDTO {
  id: string;
  status: AppointmentStatus;
  lifecycleStatus: AppointmentLifecycleStatus;
  start: string | null;
  end: string | null;
  reason: string | null;
  note: string | null;
  cancellationReason: string | null;
  patientReference: string | null;
  patientParticipantStatus: AppointmentParticipantStatus | null;
  practitionerReference: string | null;
  practitionerParticipantStatus: AppointmentParticipantStatus | null;
  practitionerDisplay: string | null;
  careTeamUserId: string | null;
}

export interface CreateAppointmentRequestInput {
  careTeamUserId: string;
  start: string;
  end: string;
  reason?: string;
  note?: string;
}

export interface UpdateAppointmentDecisionInput {
  status: "confirmed" | "declined" | "cancelled";
  comment?: string;
}
