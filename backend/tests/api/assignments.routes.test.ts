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

describe("Assignment routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];

  let admin!: TestIdentity;
  let practitioner!: TestIdentity;
  let patient!: TestIdentity;
  let patientFhirId = "";

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "assign.admin", "admin");
    practitioner = await createIdentity(app, "assign.pract", "practitioner");
    patient = await createIdentity(app, "assign.patient", "patient");

    createdEmails.push(admin.email, practitioner.email, patient.email);
    patientFhirId = `test-patient-${Date.now()}`;
  });

  afterAll(async () => {
    await Assignment.deleteMany({
      assignedUserId: {
        $in: [admin.userId, practitioner.userId, patient.userId],
      },
    });
    await cleanupUsersByEmail(createdEmails);
    await mongoose.disconnect();
  });

  it("blocks non-admin from creating assignments", async () => {
    const res = await practitioner.agent.post("/api/assignments").send({
      patientFhirId,
      assignedUserId: practitioner.userId,
      assignmentRole: "primary",
    });

    expect(res.status).toBe(403);
  });

  it("rejects admin self-assignment", async () => {
    const res = await admin.agent.post("/api/assignments").send({
      patientFhirId,
      assignedUserId: admin.userId,
      assignmentRole: "primary",
    });

    expect(res.status).toBe(403);
  });

  it("rejects assigning non-practitioner users", async () => {
    const res = await admin.agent.post("/api/assignments").send({
      patientFhirId,
      assignedUserId: patient.userId,
      assignmentRole: "primary",
    });

    expect(res.status).toBe(403);
  });

  it("creates, lists, and deactivates assignment", async () => {
    const createRes = await admin.agent.post("/api/assignments").send({
      patientFhirId,
      assignedUserId: practitioner.userId,
      assignmentRole: "primary",
    });
    expect(createRes.status).toBe(201);
    const assignmentId = createRes.body?.data?._id as string;
    expect(assignmentId).toBeTruthy();

    const listAll = await admin.agent.get("/api/assignments");
    expect(listAll.status).toBe(200);
    expect(Array.isArray(listAll.body?.data)).toBe(true);
    const foundInAllList = listAll.body.data.find(
      (a: { _id: string }) => a._id === assignmentId,
    );
    expect(foundInAllList).toBeDefined();

    const listByPatient = await admin.agent.get(
      `/api/assignments?patientFhirId=${encodeURIComponent(patientFhirId)}`,
    );
    expect(listByPatient.status).toBe(200);
    expect(Array.isArray(listByPatient.body?.data)).toBe(true);
    expect(listByPatient.body.data.length).toBeGreaterThanOrEqual(1);

    const listByUser = await admin.agent.get(
      `/api/assignments/user/${practitioner.userId}`,
    );
    expect(listByUser.status).toBe(200);
    expect(Array.isArray(listByUser.body?.data)).toBe(true);
    const foundInUserList = listByUser.body.data.find(
      (a: { _id: string }) => a._id === assignmentId,
    );
    expect(foundInUserList).toBeDefined();

    const practitioners = await admin.agent.get(
      "/api/assignments/practitioners",
    );
    expect(practitioners.status).toBe(200);
    expect(Array.isArray(practitioners.body?.data)).toBe(true);
    expect(
      practitioners.body.data.some(
        (p: { _id: string }) => p._id === practitioner.userId,
      ),
    ).toBe(true);

    const deactivate = await admin.agent.delete(
      `/api/assignments/${assignmentId}`,
    );
    expect(deactivate.status).toBe(200);
    expect(deactivate.body?.data?.active).toBe(false);

    const deactivateAgain = await admin.agent.delete(
      `/api/assignments/${assignmentId}`,
    );
    expect(deactivateAgain.status).toBe(400);
  });
});
