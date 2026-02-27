import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initAuth } from "../../src/config/auth.js";
import { connectMongo } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import { Assignment } from "../../src/models/assignment.model.js";
import {
  cleanupUsersByEmail,
  createIdentity,
  type TestIdentity,
} from "./test-helpers.js";

describe("Patient routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];
  let assignmentPatientId = "";

  let admin!: TestIdentity;
  let practitioner!: TestIdentity;
  let patient!: TestIdentity;

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "patients.admin", "admin");
    practitioner = await createIdentity(app, "patients.pract", "practitioner");
    patient = await createIdentity(app, "patients.patient", "patient");
    createdEmails.push(admin.email, practitioner.email, patient.email);
    assignmentPatientId = `assigned-${Date.now()}`;
  });

  afterAll(async () => {
    await Assignment.deleteMany({
      assignedUserId: { $in: [practitioner.userId] },
      patientFhirId: assignmentPatientId,
    });
    await cleanupUsersByEmail(createdEmails);
  });

  it("enforces role restrictions on search and assigned routes", async () => {
    const practitionerSearch = await practitioner.agent.get("/api/patients?name=john");
    expect(practitionerSearch.status).toBe(403);

    const patientAssigned = await patient.agent.get("/api/patients/assigned");
    expect(patientAssigned.status).toBe(403);
  });

  it("validates search query and returns assigned list for practitioner", async () => {
    const badSearch = await admin.agent.get("/api/patients");
    expect(badSearch.status).toBe(400);

    const noAssignments = await practitioner.agent.get("/api/patients/assigned");
    expect(noAssignments.status).toBe(200);
    expect(Array.isArray(noAssignments.body?.data)).toBe(true);
  });

  it("validates patient id and assignment access controls", async () => {
    const invalidIdAsAdmin = await admin.agent.get("/api/patients/bad id !");
    expect(invalidIdAsAdmin.status).toBe(400);

    const unassigned = await practitioner.agent.get("/api/patients/unassigned-patient-1");
    expect(unassigned.status).toBe(403);

    await Assignment.create({
      patientFhirId: assignmentPatientId,
      assignedUserId: practitioner.userId,
      assignedByUserId: admin.userId,
      assignmentRole: "primary",
      active: true,
    });

    // Assigned practitioner passes the guard; downstream may be 200/404 depending on FHIR data.
    const assignedAccess = await practitioner.agent.get(
      `/api/patients/${assignmentPatientId}`,
    );
    expect([200, 404]).toContain(assignedAccess.status);
  });
});
