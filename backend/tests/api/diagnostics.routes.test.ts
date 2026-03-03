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

const diagnosticsServiceMocks = vi.hoisted(() => ({
  listPatientDiagnostics: vi.fn(),
  getPatientDiagnostic: vi.fn(),
  listPatientDiagnosticResults: vi.fn(),
}));

vi.mock(
  "../../src/services/diagnostics.service.js",
  () => diagnosticsServiceMocks,
);

describe("Diagnostics routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const patientFhirId = `diagnostics-patient-${Date.now()}`;
  const reportId = "diag-1";

  let admin!: TestIdentity;
  let primary!: TestIdentity;
  let consulting!: TestIdentity;
  let unassigned!: TestIdentity;
  let patient!: TestIdentity;

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "diag.admin", "admin");
    primary = await createIdentity(app, "diag.primary", "practitioner");
    consulting = await createIdentity(app, "diag.consult", "practitioner");
    unassigned = await createIdentity(app, "diag.unassigned", "practitioner");
    patient = await createIdentity(app, "diag.patient", "patient");
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
    diagnosticsServiceMocks.listPatientDiagnostics.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });
    diagnosticsServiceMocks.getPatientDiagnostic.mockResolvedValue({
      id: reportId,
      resourceType: "DiagnosticReport",
      status: "final",
    });
    diagnosticsServiceMocks.listPatientDiagnosticResults.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
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

  it("enforces role and assignment rules for diagnostics endpoints", async () => {
    const basePath = `/api/patients/${patientFhirId}/diagnostics`;

    const patientList = await patient.agent.get(basePath);
    const patientGet = await patient.agent.get(`${basePath}/${reportId}`);
    const patientResults = await patient.agent.get(
      `${basePath}/${reportId}/results`,
    );
    expect(patientList.status).toBe(403);
    expect(patientGet.status).toBe(403);
    expect(patientResults.status).toBe(403);

    const unassignedList = await unassigned.agent.get(basePath);
    const unassignedGet = await unassigned.agent.get(`${basePath}/${reportId}`);
    const unassignedResults = await unassigned.agent.get(
      `${basePath}/${reportId}/results`,
    );
    expect(unassignedList.status).toBe(403);
    expect(unassignedGet.status).toBe(403);
    expect(unassignedResults.status).toBe(403);

    const consultingList = await consulting.agent.get(basePath);
    const consultingGet = await consulting.agent.get(`${basePath}/${reportId}`);
    const consultingResults = await consulting.agent.get(
      `${basePath}/${reportId}/results`,
    );
    expect(consultingList.status).toBe(200);
    expect(consultingGet.status).toBe(200);
    expect(consultingResults.status).toBe(200);

    const primaryList = await primary.agent.get(basePath);
    const primaryGet = await primary.agent.get(`${basePath}/${reportId}`);
    const primaryResults = await primary.agent.get(
      `${basePath}/${reportId}/results`,
    );
    expect(primaryList.status).toBe(200);
    expect(primaryGet.status).toBe(200);
    expect(primaryResults.status).toBe(200);

    const adminList = await admin.agent.get(basePath);
    const adminGet = await admin.agent.get(`${basePath}/${reportId}`);
    const adminResults = await admin.agent.get(
      `${basePath}/${reportId}/results`,
    );
    expect(adminList.status).toBe(200);
    expect(adminGet.status).toBe(200);
    expect(adminResults.status).toBe(200);
  });
});
