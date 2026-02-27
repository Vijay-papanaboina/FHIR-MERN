import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

describe("Vitals routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const patientId = `vitals-patient-${Date.now()}`;

  let admin!: TestIdentity;
  let practitioner!: TestIdentity;
  let patient!: TestIdentity;

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "vitals.admin", "admin");
    practitioner = await createIdentity(app, "vitals.pract", "practitioner");
    patient = await createIdentity(app, "vitals.patient", "patient");
    createdEmails.push(admin.email, practitioner.email, patient.email);
  });

  afterAll(async () => {
    await Assignment.deleteMany({
      assignedUserId: practitioner.userId,
      patientFhirId: patientId,
    });
    await cleanupUsersByEmail(createdEmails);
    await mongoose.disconnect();
  });

  it("blocks patient role from practitioner/admin vitals routes", async () => {
    const res = await patient.agent.get(`/api/patients/${patientId}/vitals`);
    expect(res.status).toBe(403);
  });

  it("rejects invalid patient id for GET /api/patients/:id/vitals", async () => {
    const badIdGet = await admin.agent.get("/api/patients/bad id !/vitals");
    expect(badIdGet.status).toBe(400);
  });

  it("rejects empty body for POST /api/patients/:id/vitals", async () => {
    const badBody = await admin.agent.post(`/api/patients/${patientId}/vitals`).send({});
    expect(badBody.status).toBe(400);
  });

  it("forbids unassigned practitioner from GET /api/patients/:id/vitals", async () => {
    const unassignedGet = await practitioner.agent.get(
      `/api/patients/${patientId}/vitals`,
    );
    expect(unassignedGet.status).toBe(403);
  });

  it("enforces write-role constraints on assignment role", async () => {
    await Assignment.create({
      patientFhirId: patientId,
      assignedUserId: practitioner.userId,
      assignedByUserId: admin.userId,
      assignmentRole: "consulting",
      active: true,
    });

    const postDenied = await practitioner.agent
      .post(`/api/patients/${patientId}/vitals`)
      .send({
        code: "8867-4",
        display: "Heart rate",
        value: 70,
        unit: "beats/minute",
        unitCode: "/min",
      });

    expect(postDenied.status).toBe(403);
  });
});
