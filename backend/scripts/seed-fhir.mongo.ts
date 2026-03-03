import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Account, User } from "../src/models/auth.model.js";
import { Assignment } from "../src/models/assignment.model.js";
import { createRng, normalizeEmail, pickName } from "./seed-fhir.util.js";
import type { FhirPatient, FhirPractitioner } from "./seed-fhir.synthea.js";
import type { SeedConfig } from "./seed-fhir.config.js";

type Role = "admin" | "practitioner" | "patient";

export const seedUsers = async (
  cfg: SeedConfig,
  patients: FhirPatient[],
  practitioners: FhirPractitioner[],
): Promise<{
  adminIds: string[];
  practitionerUserIds: string[];
  patientUserIds: string[];
  credentials: {
    admins: Array<{ email: string; password: string }>;
    practitioners: Array<{ email: string; password: string }>;
    patients: Array<{ email: string; password: string }>;
  };
}> => {
  const adminIds: string[] = [];
  const practitionerUserIds: string[] = [];
  const patientUserIds: string[] = [];
  const adminCredentials: Array<{ email: string; password: string }> = [];
  const practitionerCredentials: Array<{ email: string; password: string }> =
    [];
  const patientCredentials: Array<{ email: string; password: string }> = [];

  const ensureCredentialAccount = async (
    userId: string,
    password: string,
  ): Promise<void> => {
    const existing = await Account.findOne(
      { userId, providerId: "credential" },
      { _id: 1 },
    ).lean();
    if (existing?._id) return;

    const passwordHash = await hashPassword(password);
    await Account.create({
      _id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: passwordHash,
    });
  };

  for (let i = 0; i < cfg.admins; i++) {
    const id = `seed-admin-${String(i + 1).padStart(2, "0")}`;
    const email = `seed.admin.${String(i + 1).padStart(2, "0")}@${cfg.emailDomain}`;
    const name = `Seed Admin ${String(i + 1).padStart(2, "0")}`;
    await User.updateOne(
      { _id: id },
      {
        $set: {
          _id: id,
          name,
          email,
          emailVerified: true,
          role: "admin" as Role,
          fhirPatientId: null,
          fhirPractitionerId: null,
        },
      },
      { upsert: true },
    );
    await ensureCredentialAccount(id, cfg.defaultPassword);
    adminIds.push(id);
    adminCredentials.push({ email, password: cfg.defaultPassword });
  }

  for (let i = 0; i < practitioners.length; i++) {
    const p = practitioners[i] as FhirPractitioner;
    const fhirId = String(p.id);
    const name = pickName(p.name, `Practitioner ${i + 1}`);
    const email = `seed.${normalizeEmail(name) || `practitioner.${i + 1}`}.${fhirId.slice(0, 6)}@${cfg.emailDomain}`;
    const userId = `seed-pract-${fhirId}`;
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          _id: userId,
          name,
          email,
          emailVerified: true,
          role: "practitioner" as Role,
          fhirPatientId: null,
          fhirPractitionerId: fhirId,
        },
      },
      { upsert: true },
    );
    await ensureCredentialAccount(userId, cfg.defaultPassword);
    practitionerUserIds.push(userId);
    practitionerCredentials.push({ email, password: cfg.defaultPassword });
  }

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i] as FhirPatient;
    const fhirId = String(p.id);
    const name = pickName(p.name, `Patient ${i + 1}`);
    const email = `seed.${normalizeEmail(name) || `patient.${i + 1}`}.${fhirId.slice(0, 6)}@${cfg.emailDomain}`;
    const userId = `seed-patient-${fhirId}`;
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          _id: userId,
          name,
          email,
          emailVerified: true,
          role: "patient" as Role,
          fhirPatientId: fhirId,
          fhirPractitionerId: null,
        },
      },
      { upsert: true },
    );
    await ensureCredentialAccount(userId, cfg.defaultPassword);
    patientUserIds.push(userId);
    patientCredentials.push({ email, password: cfg.defaultPassword });
  }

  return {
    adminIds,
    practitionerUserIds,
    patientUserIds,
    credentials: {
      admins: adminCredentials,
      practitioners: practitionerCredentials,
      patients: patientCredentials,
    },
  };
};

export const seedAssignments = async (
  cfg: SeedConfig,
  patientIds: string[],
  practitionerUserIds: string[],
  adminId: string,
): Promise<{ assignedPatients: number; activeAssignments: number }> => {
  const rng = createRng(`${cfg.seedKey}:assignments`);
  const assignedPatients = Math.floor(
    patientIds.length * cfg.assignedPatientRatio,
  );
  const chosen = patientIds.slice(0, assignedPatients);
  const desiredPairKeys = new Set<string>();

  let activeAssignments = 0;

  for (let i = 0; i < chosen.length; i++) {
    const patientFhirId = chosen[i] as string;
    const primaryUserId = practitionerUserIds[
      i % practitionerUserIds.length
    ] as string;

    const desired: Array<{
      assignedUserId: string;
      assignmentRole: "primary" | "covering" | "consulting";
    }> = [{ assignedUserId: primaryUserId, assignmentRole: "primary" }];

    if (rng.next() < 0.65 && practitionerUserIds.length > 1) {
      desired.push({
        assignedUserId: practitionerUserIds[
          (i + 1) % practitionerUserIds.length
        ] as string,
        assignmentRole: "covering",
      });
    }

    if (rng.next() < 0.35 && practitionerUserIds.length > 2) {
      const candidate = practitionerUserIds[
        (i + 2) % practitionerUserIds.length
      ] as string;
      if (!desired.some((d) => d.assignedUserId === candidate)) {
        desired.push({
          assignedUserId: candidate,
          assignmentRole: "consulting",
        });
      }
    }

    for (const d of desired) {
      desiredPairKeys.add(`${patientFhirId}|${d.assignedUserId}`);
      const update = await Assignment.updateOne(
        { patientFhirId, assignedUserId: d.assignedUserId, active: true },
        {
          $set: {
            assignmentRole: d.assignmentRole,
            assignedByUserId: adminId,
            deactivatedAt: null,
          },
          $setOnInsert: { assignedAt: new Date() },
        },
        { upsert: true },
      );

      if (update.upsertedCount > 0 || update.modifiedCount > 0) {
        activeAssignments += 1;
      }
    }
  }

  const existing = await Assignment.find(
    {
      patientFhirId: { $in: patientIds },
      assignedUserId: { $in: practitionerUserIds },
      active: true,
    },
    { _id: 1, patientFhirId: 1, assignedUserId: 1 },
  ).lean();

  for (const row of existing) {
    const key = `${row.patientFhirId}|${row.assignedUserId}`;
    if (desiredPairKeys.has(key)) continue;
    await Assignment.updateOne(
      { _id: row._id },
      { $set: { active: false, deactivatedAt: new Date() } },
    );
  }

  return { assignedPatients, activeAssignments };
};

export const printSeedCredentials = (users: {
  credentials: {
    admins: Array<{ email: string; password: string }>;
    practitioners: Array<{ email: string; password: string }>;
    patients: Array<{ email: string; password: string }>;
  };
}): void => {
  const printCredentials = (
    title: string,
    rows: Array<{ email: string; password: string }>,
  ) => {
    console.log(
      `\n[seed] ${title} credentials (first ${Math.min(10, rows.length)}):`,
    );
    for (const row of rows.slice(0, 10)) {
      console.log(`[seed]   ${row.email}  |  ${row.password}`);
    }
  };

  printCredentials("Admin", users.credentials.admins);
  printCredentials("Practitioner", users.credentials.practitioners);
  printCredentials("Patient", users.credentials.patients);
  console.log(
    "\n[seed] Note: passwords are printed for seeded credential reference; user records are upserted in Mongo.",
  );
};
