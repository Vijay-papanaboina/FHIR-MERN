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
import { User } from "../../src/models/auth.model.js";
import {
  cleanupUsersByEmail,
  createIdentity,
  type TestIdentity,
} from "./test-helpers.js";

const clinicalServiceMocks = vi.hoisted(() => ({
  listPatientConditions: vi.fn(),
  getPatientCondition: vi.fn(),
  createPatientCondition: vi.fn(),
  changePatientConditionStatus: vi.fn(),
  removePatientCondition: vi.fn(),
  listPatientAllergies: vi.fn(),
  getPatientAllergy: vi.fn(),
  createPatientAllergy: vi.fn(),
  changePatientAllergyStatus: vi.fn(),
  removePatientAllergy: vi.fn(),
}));

const portalServiceMocks = vi.hoisted(() => ({
  getPortalDemographics: vi.fn(),
  getPortalCareTeam: vi.fn(),
  getPortalVitals: vi.fn(),
  submitPortalVital: vi.fn(),
  getPortalMedications: vi.fn(),
  getPortalConditions: vi.fn(),
  getPortalAllergies: vi.fn(),
}));

vi.mock(
  "../../src/services/conditions-allergies.service.js",
  () => clinicalServiceMocks,
);
vi.mock("../../src/services/portal.service.js", () => portalServiceMocks);

describe("Conditions and Allergies routes", () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const patientFhirId = `condalg-patient-${Date.now()}`;
  const conditionId = "cond-1";
  const allergyId = "alg-1";

  let admin!: TestIdentity;
  let primary!: TestIdentity;
  let consulting!: TestIdentity;
  let unassigned!: TestIdentity;
  let patient!: TestIdentity;

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    admin = await createIdentity(app, "condalg.admin", "admin");
    primary = await createIdentity(app, "condalg.primary", "practitioner");
    consulting = await createIdentity(app, "condalg.consult", "practitioner");
    unassigned = await createIdentity(
      app,
      "condalg.unassigned",
      "practitioner",
    );
    patient = await createIdentity(app, "condalg.patient", "patient");

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
    clinicalServiceMocks.listPatientConditions.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });
    clinicalServiceMocks.getPatientCondition.mockResolvedValue({
      id: conditionId,
      resourceType: "Condition",
    });
    clinicalServiceMocks.createPatientCondition.mockResolvedValue({
      id: conditionId,
      resourceType: "Condition",
    });
    clinicalServiceMocks.changePatientConditionStatus.mockResolvedValue({
      id: conditionId,
      resourceType: "Condition",
    });
    clinicalServiceMocks.removePatientCondition.mockResolvedValue({
      id: conditionId,
      deleted: true,
    });

    clinicalServiceMocks.listPatientAllergies.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });
    clinicalServiceMocks.getPatientAllergy.mockResolvedValue({
      id: allergyId,
      resourceType: "AllergyIntolerance",
    });
    clinicalServiceMocks.createPatientAllergy.mockResolvedValue({
      id: allergyId,
      resourceType: "AllergyIntolerance",
    });
    clinicalServiceMocks.changePatientAllergyStatus.mockResolvedValue({
      id: allergyId,
      resourceType: "AllergyIntolerance",
    });
    clinicalServiceMocks.removePatientAllergy.mockResolvedValue({
      id: allergyId,
      deleted: true,
    });

    portalServiceMocks.getPortalConditions.mockResolvedValue({
      resourceType: "Bundle",
      entry: [],
    });
    portalServiceMocks.getPortalAllergies.mockResolvedValue({
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

  it("enforces role and assignment rules for clinical condition/allergy endpoints", async () => {
    const conditionBasePath = `/api/patients/${patientFhirId}/conditions`;
    const allergyBasePath = `/api/patients/${patientFhirId}/allergies`;

    const patientConditionRead = await patient.agent.get(conditionBasePath);
    const patientConditionCreate = await patient.agent
      .post(conditionBasePath)
      .send({
        diagnosis: "Hypertension",
        recordedDate: "2026-03-01",
      });
    expect(patientConditionRead.status).toBe(403);
    expect(patientConditionCreate.status).toBe(403);

    const unassignedConditionRead =
      await unassigned.agent.get(conditionBasePath);
    expect(unassignedConditionRead.status).toBe(403);

    const consultingConditionRead =
      await consulting.agent.get(conditionBasePath);
    const consultingConditionCreate = await consulting.agent
      .post(conditionBasePath)
      .send({
        diagnosis: "Hypertension",
        recordedDate: "2026-03-01",
      });
    expect(consultingConditionRead.status).toBe(200);
    expect(consultingConditionCreate.status).toBe(403);

    const primaryConditionRead = await primary.agent.get(conditionBasePath);
    const primaryConditionCreate = await primary.agent
      .post(conditionBasePath)
      .send({
        diagnosis: "Hypertension",
        recordedDate: "2026-03-01",
      });
    const primaryConditionGetById = await primary.agent.get(
      `${conditionBasePath}/${conditionId}`,
    );
    const primaryConditionPatch = await primary.agent
      .patch(`${conditionBasePath}/${conditionId}`)
      .send({ status: "resolved" });
    const primaryConditionDelete = await primary.agent.delete(
      `${conditionBasePath}/${conditionId}`,
    );
    expect(primaryConditionRead.status).toBe(200);
    expect(primaryConditionCreate.status).toBe(201);
    expect(primaryConditionGetById.status).toBe(200);
    expect(primaryConditionPatch.status).toBe(200);
    expect(primaryConditionDelete.status).toBe(200);

    const adminConditionRead = await admin.agent.get(conditionBasePath);
    const adminAllergyCreate = await admin.agent.post(allergyBasePath).send({
      substance: "Penicillin",
      recordedDate: "2026-03-01",
    });
    const adminAllergyPatch = await admin.agent
      .patch(`${allergyBasePath}/${allergyId}`)
      .send({ status: "inactive" });
    const adminAllergyDelete = await admin.agent.delete(
      `${allergyBasePath}/${allergyId}`,
    );
    expect(adminConditionRead.status).toBe(200);
    expect(adminAllergyCreate.status).toBe(201);
    expect(adminAllergyPatch.status).toBe(200);
    expect(adminAllergyDelete.status).toBe(200);
  });

  it("enforces portal read-only role restrictions", async () => {
    const practitionerPortalRead = await primary.agent.get(
      "/api/portal/conditions",
    );
    expect(practitionerPortalRead.status).toBe(403);

    await User.updateOne(
      { _id: patient.userId },
      { $set: { fhirPatientId: patientFhirId } },
    );

    const patientConditions = await patient.agent.get("/api/portal/conditions");
    const patientAllergies = await patient.agent.get("/api/portal/allergies");
    expect(patientConditions.status).toBe(200);
    expect(patientAllergies.status).toBe(200);
  });
});
