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

const medicationServiceMocks = vi.hoisted(() => ({
  listPatientMedicationRequests: vi.fn(),
  getPatientMedicationRequest: vi.fn(),
  prescribeMedication: vi.fn(),
  changeMedicationStatus: vi.fn(),
}));

vi.mock(
  "../../src/services/medication.service.js",
  () => medicationServiceMocks,
);

describe("Medication routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const patientFhirId = `medication-patient-${Date.now()}`;
  const medicationId = "med-1";

  let admin!: TestIdentity;
  let primary!: TestIdentity;
  let consulting!: TestIdentity;
  let unassigned!: TestIdentity;
  let patient!: TestIdentity;

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "meds.admin", "admin");
    primary = await createIdentity(app, "meds.primary", "practitioner");
    consulting = await createIdentity(app, "meds.consult", "practitioner");
    unassigned = await createIdentity(app, "meds.unassigned", "practitioner");
    patient = await createIdentity(app, "meds.patient", "patient");
    createdEmails.push(
      admin.email,
      primary.email,
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
        assignedUserId: consulting.userId,
        assignedByUserId: admin.userId,
        assignmentRole: "consulting",
        active: true,
      },
    ]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    medicationServiceMocks.listPatientMedicationRequests.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });
    medicationServiceMocks.getPatientMedicationRequest.mockResolvedValue({
      id: medicationId,
      resourceType: "MedicationRequest",
      status: "active",
    });
    medicationServiceMocks.prescribeMedication.mockResolvedValue({
      id: medicationId,
      resourceType: "MedicationRequest",
      status: "active",
    });
    medicationServiceMocks.changeMedicationStatus.mockResolvedValue({
      id: medicationId,
      resourceType: "MedicationRequest",
      status: "completed",
    });
  });

  afterAll(async () => {
    await Assignment.deleteMany({
      patientFhirId,
      assignedUserId: {
        $in: [primary.userId, consulting.userId, unassigned.userId],
      },
    });
    await cleanupUsersByEmail(createdEmails);
    await mongoose.disconnect();
  });

  it("enforces role/assignment rules across all four endpoints", async () => {
    const basePath = `/api/patients/${patientFhirId}/medications`;

    const patientRead = await patient.agent.get(basePath);
    const patientCreate = await patient.agent.post(basePath).send({
      drugName: "Drug A",
      dosageInstructions: "Take once daily",
      frequency: "Daily",
      startDate: "2026-03-01",
    });
    const patientGetById = await patient.agent.get(
      `${basePath}/${medicationId}`,
    );
    const patientPatch = await patient.agent
      .patch(`${basePath}/${medicationId}`)
      .send({ status: "completed" });
    expect(patientRead.status).toBe(403);
    expect(patientCreate.status).toBe(403);
    expect(patientGetById.status).toBe(403);
    expect(patientPatch.status).toBe(403);

    const unassignedRead = await unassigned.agent.get(basePath);
    const unassignedCreate = await unassigned.agent.post(basePath).send({
      drugName: "Drug A",
      dosageInstructions: "Take once daily",
      frequency: "Daily",
      startDate: "2026-03-01",
    });
    const unassignedGetById = await unassigned.agent.get(
      `${basePath}/${medicationId}`,
    );
    const unassignedPatch = await unassigned.agent
      .patch(`${basePath}/${medicationId}`)
      .send({ status: "completed" });
    expect(unassignedRead.status).toBe(403);
    expect(unassignedCreate.status).toBe(403);
    expect(unassignedGetById.status).toBe(403);
    expect(unassignedPatch.status).toBe(403);

    const consultingRead = await consulting.agent.get(basePath);
    const consultingGetById = await consulting.agent.get(
      `${basePath}/${medicationId}`,
    );
    const consultingCreate = await consulting.agent.post(basePath).send({
      drugName: "Drug B",
      dosageInstructions: "Take once daily",
      frequency: "Daily",
      startDate: "2026-03-01",
    });
    const consultingPatch = await consulting.agent
      .patch(`${basePath}/${medicationId}`)
      .send({ status: "completed" });

    expect(consultingRead.status).toBe(200);
    expect(consultingGetById.status).toBe(200);
    expect(consultingCreate.status).toBe(403);
    expect(consultingPatch.status).toBe(403);

    const primaryRead = await primary.agent.get(basePath);
    const primaryCreate = await primary.agent.post(basePath).send({
      drugName: "Drug C",
      dosageInstructions: "Take once daily",
      frequency: "Daily",
      startDate: "2026-03-01",
    });
    const primaryGetById = await primary.agent.get(
      `${basePath}/${medicationId}`,
    );
    const primaryPatch = await primary.agent
      .patch(`${basePath}/${medicationId}`)
      .send({ status: "completed" });
    expect(primaryRead.status).toBe(200);
    expect(primaryCreate.status).toBe(201);
    expect(primaryGetById.status).toBe(200);
    expect(primaryPatch.status).toBe(200);

    const adminRead = await admin.agent.get(basePath);
    const adminCreate = await admin.agent.post(basePath).send({
      drugName: "Drug D",
      dosageInstructions: "Take once daily",
      frequency: "Daily",
      startDate: "2026-03-01",
    });
    const adminGetById = await admin.agent.get(`${basePath}/${medicationId}`);
    const adminPatch = await admin.agent
      .patch(`${basePath}/${medicationId}`)
      .send({ status: "completed" });
    expect(adminRead.status).toBe(200);
    expect(adminCreate.status).toBe(201);
    expect(adminGetById.status).toBe(200);
    expect(adminPatch.status).toBe(200);
  });
});
