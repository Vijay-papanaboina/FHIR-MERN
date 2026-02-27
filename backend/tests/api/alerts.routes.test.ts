import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initAuth } from "../../src/config/auth.js";
import { connectMongo } from "../../src/config/db.js";
import { env } from "../../src/config/env.js";
import { createApp } from "../../src/app.js";
import { Alert } from "../../src/models/alert.model.js";
import { Assignment } from "../../src/models/assignment.model.js";
import {
  cleanupUsersByEmail,
  createIdentity,
  type TestIdentity,
} from "./test-helpers.js";

describe("Alert routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const patientFhirId = `alert-patient-${Date.now()}`;

  let admin!: TestIdentity;
  let practitioner!: TestIdentity;
  let practitioner2!: TestIdentity;
  let patient!: TestIdentity;
  let alertId = "";
  let privateAlertId = "";

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "alerts.admin", "admin");
    practitioner = await createIdentity(app, "alerts.pract", "practitioner");
    practitioner2 = await createIdentity(app, "alerts.pract2", "practitioner");
    patient = await createIdentity(app, "alerts.patient", "patient");

    createdEmails.push(
      admin.email,
      practitioner.email,
      practitioner2.email,
      patient.email,
    );

    const [a1, a2] = await Alert.create([
      {
        patientFhirId,
        observationId: `obs-${Date.now()}-1`,
        type: "WARNING_HIGH_HEART_RATE",
        message: "warning",
        value: 110,
        unit: "bpm",
        severity: "warning",
        sentToUserIds: [practitioner.userId],
        recordDate: new Date(),
      },
      {
        patientFhirId,
        observationId: `obs-${Date.now()}-2`,
        type: "CRITICAL_HIGH_HEART_RATE",
        message: "critical",
        value: 150,
        unit: "bpm",
        severity: "critical",
        sentToUserIds: [practitioner2.userId],
        recordDate: new Date(),
      },
    ]);

    expect(a1?._id, "Expected first seeded alert to exist").toBeTruthy();
    expect(a2?._id, "Expected second seeded alert to exist").toBeTruthy();
    alertId = String(a1!._id);
    privateAlertId = String(a2!._id);
  });

  afterAll(async () => {
    await Alert.deleteMany({
      _id: { $in: [alertId, privateAlertId] },
    });
    await Assignment.deleteMany({
      patientFhirId,
      assignedUserId: { $in: [practitioner.userId, practitioner2.userId] },
    });
    await cleanupUsersByEmail(createdEmails);
  });

  it("blocks patient role from alert APIs", async () => {
    const res = await patient.agent.get("/api/alerts");
    expect(res.status).toBe(403);
  });

  it("returns user-targeted alerts for practitioner and global list for admin", async () => {
    const practitionerAlerts = await practitioner.agent.get("/api/alerts");
    expect(practitionerAlerts.status).toBe(200);
    expect(Array.isArray(practitionerAlerts.body?.data?.items)).toBe(true);
    expect(
      practitionerAlerts.body.data.items.some((a: { _id: string }) => a._id === alertId),
    ).toBe(true);

    const adminAlerts = await admin.agent.get("/api/alerts");
    expect(adminAlerts.status).toBe(200);
    expect(Array.isArray(adminAlerts.body?.data?.items)).toBe(true);
    expect(
      adminAlerts.body.data.items.some((a: { _id: string }) => a._id === alertId),
    ).toBe(true);
    expect(
      adminAlerts.body.data.items.some(
        (a: { _id: string }) => a._id === privateAlertId,
      ),
    ).toBe(true);
  });

  it("enforces patient-assignment for patient alert listing", async () => {
    const noAssignment = await practitioner.agent.get(
      `/api/alerts/patient/${patientFhirId}`,
    );
    expect(noAssignment.status).toBe(403);

    await Assignment.create({
      patientFhirId,
      assignedUserId: practitioner.userId,
      assignedByUserId: admin.userId,
      assignmentRole: "primary",
      active: true,
    });

    const withAssignment = await practitioner.agent.get(
      `/api/alerts/patient/${patientFhirId}`,
    );
    expect(withAssignment.status).toBe(200);
    expect(Array.isArray(withAssignment.body?.data?.items)).toBe(true);
  });

  it("enforces recipient rules for acknowledge endpoint", async () => {
    const practitionerForbidden = await practitioner.agent.post(
      `/api/alerts/${privateAlertId}/acknowledge`,
    );
    expect(practitionerForbidden.status).toBe(403);

    const adminAllowed = await admin.agent.post(`/api/alerts/${privateAlertId}/acknowledge`);
    expect(adminAllowed.status).toBe(200);
    expect(Array.isArray(adminAllowed.body?.data?.acknowledgedBy)).toBe(true);
  });

  it("requires webhook secret when configured", async () => {
    const originalSecret = env.WEBHOOK_SECRET;
    try {
      env.WEBHOOK_SECRET = "1234567890abcdef";
      const noSecret = await admin.agent.post("/api/alerts/webhook").send({
        resourceType: "Observation",
        id: `obs-${Date.now()}-webhook`,
      });
      expect(noSecret.status).toBe(401);
    } finally {
      env.WEBHOOK_SECRET = originalSecret;
    }
  });

  it("accepts webhook request with correct secret", async () => {
    const originalSecret = env.WEBHOOK_SECRET;
    try {
      env.WEBHOOK_SECRET = "1234567890abcdef";
      const withSecret = await admin.agent
        .post("/api/alerts/webhook")
        .set("x-webhook-secret", "1234567890abcdef")
        .send({ resourceType: "Patient", id: "p-noop" });
      expect(withSecret.status).toBe(200);
      expect(withSecret.body?.received).toBe(true);
    } finally {
      env.WEBHOOK_SECRET = originalSecret;
    }
  });
});
