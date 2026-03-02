import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/AppError.js";

const assignmentRepoMocks = vi.hoisted(() => ({
  findActiveAssignment: vi.fn(),
  getAssignmentsByPatient: vi.fn(),
}));

const appointmentRepoMocks = vi.hoisted(() => ({
  createAppointment: vi.fn(),
  getAppointmentById: vi.fn(),
  getAppointmentsByPatient: vi.fn(),
  updateAppointment: vi.fn(),
}));

const appointmentResponseRepoMocks = vi.hoisted(() => ({
  createResponseAndSyncAppointmentStatus: vi.fn(),
}));

const userRepoMocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
  findUserByFhirPatientId: vi.fn(),
}));

const alertModelMocks = vi.hoisted(() => ({
  Alert: {
    create: vi.fn(),
  },
}));

const authModelMocks = vi.hoisted(() => ({
  User: {
    find: vi.fn(),
  },
}));

const sseManagerMocks = vi.hoisted(() => ({
  sendToUsers: vi.fn(),
}));

vi.mock(
  "../../src/repositories/assignment.repository.js",
  () => assignmentRepoMocks,
);
vi.mock(
  "../../src/repositories/appointment.repository.js",
  () => appointmentRepoMocks,
);
vi.mock(
  "../../src/repositories/appointment-response.repository.js",
  () => appointmentResponseRepoMocks,
);
vi.mock("../../src/repositories/user.repository.js", () => userRepoMocks);
vi.mock("../../src/models/alert.model.js", () => alertModelMocks);
vi.mock("../../src/models/auth.model.js", () => authModelMocks);
vi.mock("../../src/services/sse.manager.js", () => sseManagerMocks);

import {
  createClinicalPatientAppointment,
  decideClinicalPatientAppointment,
  listClinicalPatientAppointments,
} from "../../src/services/appointment.service.js";

describe("appointment.service", () => {
  const patientFhirId = "patient-1";

  beforeEach(() => {
    vi.clearAllMocks();
    authModelMocks.User.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });
    assignmentRepoMocks.getAssignmentsByPatient.mockResolvedValue([]);
    userRepoMocks.findUserByFhirPatientId.mockResolvedValue(null);
  });

  it("rejects unassigned practitioner read access", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue(null);

    await expect(
      listClinicalPatientAppointments(
        { userId: "u-pract", role: "practitioner" },
        patientFhirId,
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("blocks consulting practitioner from creating appointments", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "consulting",
    });

    await expect(
      createClinicalPatientAppointment(
        { userId: "u-consult", role: "practitioner", name: "Dr Consult" },
        patientFhirId,
        {
          careTeamUserId: "u-primary",
          start: "2099-03-01T10:00:00.000Z",
          end: "2099-03-01T10:30:00.000Z",
          reason: "Follow-up",
        },
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 403 });
  });

  it("allows primary practitioner to create appointments", async () => {
    assignmentRepoMocks.findActiveAssignment
      .mockResolvedValueOnce({ assignmentRole: "primary" })
      .mockResolvedValueOnce({ assignmentRole: "primary" });
    userRepoMocks.findUserById.mockResolvedValue({
      _id: "u-primary",
      role: "practitioner",
      name: "Dr Primary",
      fhirPractitionerId: "pract-1",
    });
    appointmentRepoMocks.createAppointment.mockResolvedValue({
      id: "appt-1",
      status: "pending",
      participant: [
        { actor: { reference: `Patient/${patientFhirId}` } },
        {
          actor: { reference: "Practitioner/pract-1", display: "Dr Primary" },
        },
      ],
    });

    const out = await createClinicalPatientAppointment(
      { userId: "u-primary", role: "practitioner", name: "Dr Primary" },
      patientFhirId,
      {
        careTeamUserId: "u-primary",
        start: "2099-03-01T11:00:00.000Z",
        end: "2099-03-01T11:30:00.000Z",
        reason: "BP follow-up",
      },
    );

    expect(appointmentRepoMocks.createAppointment).toHaveBeenCalledWith(
      patientFhirId,
      "pract-1",
      expect.objectContaining({
        status: "pending",
        patientParticipantStatus: "accepted",
        practitionerParticipantStatus: "needs-action",
      }),
    );
    expect(out).toEqual(expect.objectContaining({ id: "appt-1" }));
  });

  it("allows admin bypass for practitioner-assignment check", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValueOnce({
      assignmentRole: "covering",
    });
    userRepoMocks.findUserById.mockResolvedValue({
      _id: "u-covering",
      role: "practitioner",
      name: "Dr Covering",
      fhirPractitionerId: "pract-2",
    });
    appointmentRepoMocks.createAppointment.mockResolvedValue({
      id: "appt-2",
      status: "pending",
      participant: [
        { actor: { reference: `Patient/${patientFhirId}` } },
        {
          actor: {
            reference: "Practitioner/pract-2",
            display: "Dr Covering",
          },
        },
      ],
    });

    await createClinicalPatientAppointment(
      { userId: "u-admin", role: "admin", name: "Admin" },
      patientFhirId,
      {
        careTeamUserId: "u-covering",
        start: "2099-03-01T12:00:00.000Z",
        end: "2099-03-01T12:30:00.000Z",
      },
    );

    expect(assignmentRepoMocks.findActiveAssignment).not.toHaveBeenCalledWith(
      patientFhirId,
      "u-admin",
    );
  });

  it("rejects invalid status transition", async () => {
    assignmentRepoMocks.findActiveAssignment.mockResolvedValue({
      assignmentRole: "primary",
    });
    appointmentRepoMocks.getAppointmentById.mockResolvedValue({
      id: "appt-3",
      status: "booked",
      participant: [{ actor: { reference: `Patient/${patientFhirId}` } }],
    });

    await expect(
      decideClinicalPatientAppointment(
        { userId: "u-primary", role: "practitioner" },
        patientFhirId,
        "appt-3",
        { status: "confirmed" },
      ),
    ).rejects.toMatchObject<AppError>({ statusCode: 400 });
  });
});
