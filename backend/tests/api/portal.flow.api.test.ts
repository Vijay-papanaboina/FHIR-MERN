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

const TEST_FHIR_BASE_URL = process.env["FHIR_BASE_URL"] ?? "http://localhost:8080/fhir";
const FETCH_TIMEOUT_MS = 8000;

interface CareTeamMember {
  name: string;
  assignmentRole: "primary" | "covering" | "consulting";
  image?: string;
  email?: string;
  _id?: string;
}

const getAnyFhirPatientId = async (): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(`${TEST_FHIR_BASE_URL}/Patient?_count=1`, {
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  expect(response.ok, "FHIR server unavailable or Patient query failed").toBe(true);
  const data = await response.json();
  const id = data?.entry?.[0]?.resource?.id;
  expect(id, "No FHIR Patient found. Seed FHIR first.").toBeTruthy();
  return id as string;
};

const runEmails: string[] = [];
const createdAssignmentIds: string[] = [];
const app = createApp();
let admin!: TestIdentity;
let practitioner!: TestIdentity;
let patient!: TestIdentity;

beforeAll(async () => {
  await connectMongo();
  initAuth();

  admin = await createIdentity(app, "portalflow.admin", "admin");
  practitioner = await createIdentity(app, "portalflow.pract", "practitioner");
  patient = await createIdentity(app, "portalflow.patient", "patient");

  runEmails.push(admin.email, practitioner.email, patient.email);
});

afterAll(async () => {
  if (createdAssignmentIds.length > 0) {
    await Assignment.deleteMany({ _id: { $in: createdAssignmentIds } });
  }
  await cleanupUsersByEmail(runEmails);
  await mongoose.disconnect();
});

describe("Portal API flow", () => {
  it("covers user/auth routes + portal flow (excluding SSE)", async () => {
    const fhirPatientId = await getAnyFhirPatientId();

    // Hit auth/me route for all identities.
    const adminMe = await admin.agent.get("/api/auth/me");
    expect(adminMe.status).toBe(200);
    expect(adminMe.body?.data?.role).toBe("admin");

    const practitionerMe = await practitioner.agent.get("/api/auth/me");
    expect(practitionerMe.status).toBe(200);
    const practitionerUserId = practitionerMe.body?.data?.id as string;
    expect(practitionerUserId).toBeTruthy();

    const patientMe = await patient.agent.get("/api/auth/me");
    expect(patientMe.status).toBe(200);
    const patientUserId = patientMe.body?.data?.id as string;
    expect(patientUserId).toBeTruthy();

    const roleForbidden = await patient.agent
      .patch(`/api/users/${practitionerUserId}/role`)
      .send({ role: "patient" });
    expect(roleForbidden.status).toBe(403);

    const roleUpdate = await admin.agent
      .patch(`/api/users/${practitionerUserId}/role`)
      .send({ role: "patient" });
    expect(roleUpdate.status).toBe(200);
    expect(roleUpdate.body?.data?.role).toBe("patient");

    const roleRestore = await admin.agent
      .patch(`/api/users/${practitionerUserId}/role`)
      .send({ role: "practitioner" });
    expect(roleRestore.status).toBe(200);
    expect(roleRestore.body?.data?.role).toBe("practitioner");

    // Unlinked patient should be blocked from portal routes.
    const meUnlinked = await patient.agent.get("/api/portal/me");
    expect(meUnlinked.status).toBe(403);

    const linkPatient = await admin.agent
      .patch(`/api/users/${patientUserId}/link-patient`)
      .send({ fhirPatientId });
    expect(linkPatient.status).toBe(200);
    expect(linkPatient.body?.data?.fhirPatientId).toBe(fhirPatientId);

    // Create assignment so care-team endpoint has deterministic content.
    const assign = await admin.agent.post("/api/assignments").send({
      patientFhirId: fhirPatientId,
      assignedUserId: practitionerUserId,
      assignmentRole: "primary",
    });
    expect(assign.status).toBe(201);
    expect(assign.body?.data?._id).toBeTruthy();
    createdAssignmentIds.push(String(assign.body.data._id));

    const me = await patient.agent.get("/api/portal/me");
    expect(me.status).toBe(200);
    expect(me.body?.status).toBe("success");
    expect(me.body?.data?.id).toBe(fhirPatientId);

    const careTeam = await patient.agent.get("/api/portal/care-team");
    expect(careTeam.status).toBe(200);
    expect(careTeam.body?.status).toBe("success");
    expect(Array.isArray(careTeam.body?.data)).toBe(true);
    for (const member of careTeam.body.data as CareTeamMember[]) {
      expect("name" in member).toBe(true);
      expect("assignmentRole" in member).toBe(true);
      expect("email" in member).toBe(false);
      expect("_id" in member).toBe(false);
    }

    const vitalsBefore = await patient.agent.get("/api/portal/vitals");
    expect(vitalsBefore.status).toBe(200);
    expect(vitalsBefore.body?.status).toBe("success");

    const createVital = await patient.agent.post("/api/portal/vitals").send({
      code: "8867-4",
      display: "Heart rate",
      value: 74,
      unit: "beats/minute",
      unitCode: "/min",
    });
    expect(createVital.status).toBe(201);
    expect(createVital.body?.status).toBe("success");

    const observationId = createVital.body?.data?.id as string;
    expect(observationId).toBeTruthy();

    const obsController = new AbortController();
    const obsTimeout = setTimeout(() => obsController.abort(), FETCH_TIMEOUT_MS);
    const hapiObservationResponse = await fetch(
      `${TEST_FHIR_BASE_URL}/Observation/${observationId}`,
      { signal: obsController.signal },
    ).finally(() => clearTimeout(obsTimeout));
    expect(hapiObservationResponse.ok).toBe(true);
    const hapiObservation = await hapiObservationResponse.json();
    const performerRef = hapiObservation?.performer?.[0]?.reference;
    expect(performerRef).toBe(`Patient/${fhirPatientId}`);

    // Hit practitioner clinical vitals route.
    const practitionerVitals = await practitioner.agent.get(
      `/api/patients/${fhirPatientId}/vitals`,
    );
    expect(practitionerVitals.status).toBe(200);
    expect(practitionerVitals.body?.status).toBe("success");

  });
});
