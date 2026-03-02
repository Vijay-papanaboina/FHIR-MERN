import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { initAuth } from "../../src/config/auth.js";
import { connectMongo } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { Assignment } from "../../src/models/assignment.model.js";
import {
  cleanupUsersByEmail,
  createIdentity,
  type TestIdentity,
} from "./test-helpers.js";

const appointmentServiceMocks = vi.hoisted(() => ({
  listClinicalPatientAppointments: vi.fn(),
  createClinicalPatientAppointment: vi.fn(),
  getClinicalPatientAppointmentById: vi.fn(),
  decideClinicalPatientAppointment: vi.fn(),
  listPortalAppointments: vi.fn(),
  createPortalAppointment: vi.fn(),
  cancelPortalAppointment: vi.fn(),
}));

vi.mock(
  "../../src/services/appointment.service.js",
  () => appointmentServiceMocks,
);

describe("Appointment routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const patientFhirId = `appointment-patient-${Date.now()}`;
  const appointmentId = "appt-1";

  let admin!: TestIdentity;
  let primary!: TestIdentity;
  let covering!: TestIdentity;
  let consulting!: TestIdentity;
  let unassigned!: TestIdentity;
  let patient!: TestIdentity;

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "appt.admin", "admin");
    primary = await createIdentity(app, "appt.primary", "practitioner");
    covering = await createIdentity(app, "appt.covering", "practitioner");
    consulting = await createIdentity(app, "appt.consult", "practitioner");
    unassigned = await createIdentity(app, "appt.unassigned", "practitioner");
    patient = await createIdentity(app, "appt.patient", "patient");
    createdEmails.push(
      admin.email,
      primary.email,
      covering.email,
      consulting.email,
      unassigned.email,
      patient.email,
    );

    await Assignment.create([
      {
        patientFhirId,
        assignedUserId: primary.userId,
        assignedByUserId: admin.userId,
        assignmentRole: "primary",
        active: true,
      },
      {
        patientFhirId,
        assignedUserId: covering.userId,
        assignedByUserId: admin.userId,
        assignmentRole: "covering",
        active: true,
      },
      {
        patientFhirId,
        assignedUserId: consulting.userId,
        assignedByUserId: admin.userId,
        assignmentRole: "consulting",
        active: true,
      },
    ]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    appointmentServiceMocks.listClinicalPatientAppointments.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });
    appointmentServiceMocks.getClinicalPatientAppointmentById.mockResolvedValue(
      {
        id: appointmentId,
        resourceType: "Appointment",
        status: "pending",
      },
    );
    appointmentServiceMocks.createClinicalPatientAppointment.mockResolvedValue({
      id: appointmentId,
      resourceType: "Appointment",
      status: "pending",
    });
    appointmentServiceMocks.decideClinicalPatientAppointment.mockResolvedValue({
      id: appointmentId,
      resourceType: "Appointment",
      status: "booked",
    });
  });

  afterAll(async () => {
    await Assignment.deleteMany({
      patientFhirId,
      assignedUserId: {
        $in: [
          primary.userId,
          covering.userId,
          consulting.userId,
          unassigned.userId,
        ],
      },
    });
    await cleanupUsersByEmail(createdEmails);
    await mongoose.disconnect();
  });

  it("enforces role and assignment rules across all appointment endpoints", async () => {
    const basePath = `/api/patients/${patientFhirId}/appointments`;
    const createPayload = {
      careTeamUserId: primary.userId,
      start: "2099-03-01T10:00:00.000Z",
      end: "2099-03-01T10:30:00.000Z",
      reason: "Follow-up",
    };

    const patientRead = await patient.agent.get(basePath);
    const patientCreate = await patient.agent
      .post(basePath)
      .send(createPayload);
    const patientGetById = await patient.agent.get(
      `${basePath}/${appointmentId}`,
    );
    const patientPatch = await patient.agent
      .patch(`${basePath}/${appointmentId}`)
      .send({ status: "confirmed" });
    expect(patientRead.status).toBe(403);
    expect(patientCreate.status).toBe(403);
    expect(patientGetById.status).toBe(403);
    expect(patientPatch.status).toBe(403);

    const unassignedRead = await unassigned.agent.get(basePath);
    const unassignedCreate = await unassigned.agent
      .post(basePath)
      .send(createPayload);
    const unassignedGetById = await unassigned.agent.get(
      `${basePath}/${appointmentId}`,
    );
    const unassignedPatch = await unassigned.agent
      .patch(`${basePath}/${appointmentId}`)
      .send({ status: "confirmed" });
    expect(unassignedRead.status).toBe(403);
    expect(unassignedCreate.status).toBe(403);
    expect(unassignedGetById.status).toBe(403);
    expect(unassignedPatch.status).toBe(403);

    const consultingRead = await consulting.agent.get(basePath);
    const consultingGetById = await consulting.agent.get(
      `${basePath}/${appointmentId}`,
    );
    const consultingCreate = await consulting.agent
      .post(basePath)
      .send(createPayload);
    const consultingPatch = await consulting.agent
      .patch(`${basePath}/${appointmentId}`)
      .send({ status: "confirmed" });
    expect(consultingRead.status).toBe(200);
    expect(consultingGetById.status).toBe(200);
    expect(consultingCreate.status).toBe(403);
    expect(consultingPatch.status).toBe(403);

    const primaryRead = await primary.agent.get(basePath);
    const primaryCreate = await primary.agent
      .post(basePath)
      .send(createPayload);
    const primaryGetById = await primary.agent.get(
      `${basePath}/${appointmentId}`,
    );
    const primaryPatch = await primary.agent
      .patch(`${basePath}/${appointmentId}`)
      .send({ status: "confirmed" });
    expect(primaryRead.status).toBe(200);
    expect(primaryCreate.status).toBe(201);
    expect(primaryGetById.status).toBe(200);
    expect(primaryPatch.status).toBe(200);

    const coveringRead = await covering.agent.get(basePath);
    const coveringCreate = await covering.agent
      .post(basePath)
      .send(createPayload);
    const coveringGetById = await covering.agent.get(
      `${basePath}/${appointmentId}`,
    );
    const coveringPatch = await covering.agent
      .patch(`${basePath}/${appointmentId}`)
      .send({ status: "declined" });
    expect(coveringRead.status).toBe(200);
    expect(coveringCreate.status).toBe(201);
    expect(coveringGetById.status).toBe(200);
    expect(coveringPatch.status).toBe(200);

    const adminRead = await admin.agent.get(basePath);
    const adminCreate = await admin.agent.post(basePath).send(createPayload);
    const adminGetById = await admin.agent.get(`${basePath}/${appointmentId}`);
    const adminPatch = await admin.agent
      .patch(`${basePath}/${appointmentId}`)
      .send({ status: "cancelled" });
    expect(adminRead.status).toBe(200);
    expect(adminCreate.status).toBe(201);
    expect(adminGetById.status).toBe(200);
    expect(adminPatch.status).toBe(200);
  });
});
