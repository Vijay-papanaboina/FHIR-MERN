import dotenv from "dotenv";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Account, User } from "../src/models/auth.model.js";
import { Assignment } from "../src/models/assignment.model.js";
import {
  loadSyntheaDataFromZip,
  type FhirMedicationRequest,
  type FhirObservation,
  type FhirPatient,
  type FhirPractitioner,
} from "./seed-fhir.synthea.js";
import {
  createRng,
  normalizeEmail,
  pickName,
  sampleByPatient,
  subjectPatientId,
} from "./seed-fhir.util.js";

dotenv.config();
if (!process.env["FHIR_SECRET"]) {
  dotenv.config({ path: "backend/.env" });
}

const FHIR_BASE_URL = String(process.env["FHIR_BASE_URL"] ?? "").replace(
  /\/+$/,
  "",
);
const FHIR_SECRET = String(process.env["FHIR_SECRET"] ?? "");
const MONGO_URI = String(process.env["MONGO_URI"] ?? "");

if (!FHIR_BASE_URL || !FHIR_SECRET || !MONGO_URI) {
  console.error("Missing FHIR_BASE_URL, FHIR_SECRET, or MONGO_URI");
  process.exit(1);
}

type Role = "admin" | "practitioner" | "patient";

interface SeedConfig {
  admins: number;
  practitioners: number;
  patients: number;
  assignedPatientRatio: number;
  vitalsPerPatient: number;
  minMedsPerPatient: number;
  maxMedsPerPatient: number;
  emailDomain: string;
  seedKey: string;
  defaultPassword: string;
  syntheaZipUrl: string;
  syntheaZipPath: string;
  syntheaExtractDir: string;
}

interface BundleEntry {
  resource: Record<string, unknown>;
  request: { method: "PUT"; url: string };
}

const normalizePatientSubjectReference = (
  resource: Record<string, unknown>,
): Record<string, unknown> => {
  const subjectRaw = resource["subject"];
  if (!subjectRaw || typeof subjectRaw !== "object") return resource;

  const subject = subjectRaw as { reference?: unknown };
  const patientId =
    typeof subject.reference === "string"
      ? subjectPatientId(subject.reference)
      : null;
  if (!patientId) return resource;

  return {
    ...resource,
    subject: {
      ...(subject as Record<string, unknown>),
      reference: `Patient/${patientId}`,
    },
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const sanitizeObservationResource = (
  resource: Record<string, unknown>,
): Record<string, unknown> | null => {
  const normalized = normalizePatientSubjectReference(resource);
  const id = asString(normalized["id"]);
  const subject = asRecord(normalized["subject"]);
  const subjectRef = asString(subject?.["reference"]);
  const code = asRecord(normalized["code"]);
  const valueQuantity = asRecord(normalized["valueQuantity"]);

  if (!id || !subjectRef || !code || !valueQuantity) return null;

  return {
    resourceType: "Observation",
    id,
    status: asString(normalized["status"]) ?? "final",
    category:
      Array.isArray(normalized["category"]) && normalized["category"].length > 0
        ? normalized["category"]
        : [
            {
              coding: [
                {
                  system:
                    "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "vital-signs",
                  display: "Vital Signs",
                },
              ],
            },
          ],
    code,
    subject: { reference: subjectRef },
    effectiveDateTime:
      asString(normalized["effectiveDateTime"]) ??
      asString(normalized["issued"]) ??
      new Date().toISOString(),
    valueQuantity,
  };
};

const sanitizeMedicationResource = (
  resource: Record<string, unknown>,
  fallbackPractitionerId: string,
): Record<string, unknown> | null => {
  const normalized = normalizePatientSubjectReference(resource);
  const id = asString(normalized["id"]);
  const subject = asRecord(normalized["subject"]);
  const subjectRef = asString(subject?.["reference"]);
  if (!id || !subjectRef) return null;

  const statusRaw = asString(normalized["status"]);
  const status =
    statusRaw &&
    [
      "active",
      "on-hold",
      "cancelled",
      "completed",
      "entered-in-error",
      "stopped",
      "draft",
      "unknown",
    ].includes(statusRaw)
      ? statusRaw
      : "active";

  const intent = asString(normalized["intent"]) ?? "order";

  const requesterRaw = asRecord(normalized["requester"]);
  const requesterRef = asString(requesterRaw?.["reference"]);
  const requester = requesterRef?.startsWith("Practitioner/")
    ? {
        reference: requesterRef,
        ...(asString(requesterRaw?.["display"])
          ? { display: asString(requesterRaw?.["display"]) }
          : {}),
      }
    : { reference: `Practitioner/${fallbackPractitionerId}` };

  let medicationCodeableConcept = asRecord(
    normalized["medicationCodeableConcept"],
  );
  if (!medicationCodeableConcept) {
    const medicationReference = asRecord(normalized["medicationReference"]);
    const display = asString(medicationReference?.["display"]);
    medicationCodeableConcept = { text: display ?? "Medication" };
  }

  const dosageInstruction = Array.isArray(normalized["dosageInstruction"])
    ? normalized["dosageInstruction"]
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => !!item)
        .map((item) => {
          const text = asString(item["text"]);
          return text ? { text } : item;
        })
    : [];

  return {
    resourceType: "MedicationRequest",
    id,
    status,
    intent,
    authoredOn: asString(normalized["authoredOn"]) ?? new Date().toISOString(),
    subject: { reference: subjectRef },
    requester,
    medicationCodeableConcept,
    ...(dosageInstruction.length > 0 ? { dosageInstruction } : {}),
  };
};

const parseIntArg = (name: string, fallback: number): number => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const parsed = Number.parseInt(arg.slice(name.length + 3), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseConfig = (): SeedConfig => {
  const admins = parseIntArg("admins", 2);
  const practitioners = parseIntArg("practitioners", 10);
  const patients = parseIntArg("patients", 40);
  const vitalsPerPatient = parseIntArg("vitalsPerPatient", 24);
  const minMedsPerPatientArg = parseIntArg("minMedsPerPatient", 3);
  const maxMedsPerPatientArg = parseIntArg("maxMedsPerPatient", 5);
  const boundedMinMedsPerPatient = Math.max(
    1,
    Math.min(minMedsPerPatientArg, 15),
  );

  return {
    admins: Math.max(1, Math.min(admins, 5)),
    practitioners: Math.max(1, Math.min(practitioners, 30)),
    patients: Math.max(1, Math.min(patients, 200)),
    assignedPatientRatio: 0.75,
    vitalsPerPatient: Math.max(1, Math.min(vitalsPerPatient, 100)),
    minMedsPerPatient: boundedMinMedsPerPatient,
    maxMedsPerPatient: Math.max(
      boundedMinMedsPerPatient,
      Math.min(maxMedsPerPatientArg, 20),
    ),
    emailDomain: String(process.env["SEED_EMAIL_DOMAIN"] ?? "example.com"),
    seedKey: String(process.env["SEED_KEY"] ?? "v1"),
    defaultPassword: String(
      process.env["SEED_DEFAULT_PASSWORD"] ?? "Password123!",
    ),
    syntheaZipUrl: String(
      process.env["SYNTHEA_ZIP_URL"] ??
        "https://synthetichealth.github.io/synthea-sample-data/downloads/synthea_sample_data_fhir_r4_sep2019.zip",
    ),
    syntheaZipPath: String(
      process.env["SYNTHEA_ZIP_PATH"] ??
        "/tmp/synthea_sample_data_fhir_r4_seed.zip",
    ),
    syntheaExtractDir: String(
      process.env["SYNTHEA_EXTRACT_DIR"] ?? "/tmp/synthea_sample_data_fhir_r4",
    ),
  };
};

const isVitalObservation = (obs: FhirObservation): boolean => {
  return (
    obs.category?.some((cat) =>
      cat.coding?.some((coding) => coding.code === "vital-signs"),
    ) ?? false
  );
};

const postTransaction = async (entries: BundleEntry[]): Promise<void> => {
  if (entries.length === 0) return;

  const res = await fetch(FHIR_BASE_URL, {
    method: "POST",
    headers: {
      Accept: "application/fhir+json",
      "Content-Type": "application/fhir+json",
      "X-FHIR-Secret": FHIR_SECRET,
    },
    body: JSON.stringify({
      resourceType: "Bundle",
      type: "transaction",
      entry: entries,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `FHIR transaction failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }
};

const postTransactionInChunks = async (
  entries: BundleEntry[],
  chunkSize = 120,
): Promise<void> => {
  for (let i = 0; i < entries.length; i += chunkSize) {
    await postTransaction(entries.slice(i, i + chunkSize));
  }
};

const toPutEntry = (resource: Record<string, unknown>): BundleEntry => {
  const type = String(resource.resourceType ?? "");
  const id = String(resource.id ?? "");
  if (!type || !id) throw new Error("Resource missing resourceType/id");
  return {
    resource,
    request: { method: "PUT", url: `${type}/${id}` },
  };
};

const seedUsers = async (
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

const seedAssignments = async (
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

async function main() {
  const cfg = parseConfig();

  console.log("\n[seed] Starting Synthea-based seed...");
  console.log(
    `[seed] admins=${cfg.admins}, practitioners=${cfg.practitioners}, patients=${cfg.patients}`,
  );
  console.log(`[seed] Downloading zip to: ${cfg.syntheaZipPath}`);

  await mongoose.connect(MONGO_URI);

  const loaded = await loadSyntheaDataFromZip(
    cfg.syntheaZipUrl,
    cfg.syntheaZipPath,
    cfg.syntheaExtractDir,
    cfg.patients,
    cfg.practitioners,
  );

  const patientIdSet = new Set(loaded.patients.map((p) => p.id));

  const vitals = sampleByPatient(
    loaded.observations.filter(isVitalObservation),
    patientIdSet,
    () => cfg.vitalsPerPatient,
    `${cfg.seedKey}:vitals`,
  );

  const meds = sampleByPatient(
    loaded.medications,
    patientIdSet,
    (rng) => rng.int(cfg.minMedsPerPatient, cfg.maxMedsPerPatient),
    `${cfg.seedKey}:medications`,
  );

  console.log(
    `[seed] Selected resources: practitioners=${loaded.practitioners.length}, patients=${loaded.patients.length}, vitals=${vitals.length}, meds=${meds.length}`,
  );

  const fallbackPractitionerId = loaded.practitioners[0]?.id;
  if (!fallbackPractitionerId) {
    throw new Error(
      "No practitioner available for medication requester fallback",
    );
  }

  const sanitizedVitals = vitals
    .map((o) =>
      sanitizeObservationResource(o as unknown as Record<string, unknown>),
    )
    .filter((item): item is Record<string, unknown> => !!item);

  const sanitizedMeds = meds
    .map((m) =>
      sanitizeMedicationResource(
        m as unknown as Record<string, unknown>,
        fallbackPractitionerId,
      ),
    )
    .filter((item): item is Record<string, unknown> => !!item);

  const fhirEntries: BundleEntry[] = [
    ...loaded.practitioners.map((p) =>
      toPutEntry(p as unknown as Record<string, unknown>),
    ),
    ...loaded.patients.map((p) =>
      toPutEntry(p as unknown as Record<string, unknown>),
    ),
    ...sanitizedVitals.map((o) => toPutEntry(o)),
    ...sanitizedMeds.map((m) => toPutEntry(m)),
  ];

  await postTransactionInChunks(fhirEntries);

  const users = await seedUsers(cfg, loaded.patients, loaded.practitioners);
  const adminId = users.adminIds[0];
  if (!adminId) throw new Error("No seeded admin available for assignments");

  const assignmentSummary = await seedAssignments(
    cfg,
    loaded.patients.map((p) => p.id),
    users.practitionerUserIds,
    adminId,
  );

  console.log("\n[seed] Done.");
  console.log(
    `[seed] Mongo users: admins=${users.adminIds.length}, practitioners=${users.practitionerUserIds.length}, patients=${users.patientUserIds.length}`,
  );
  console.log(
    `[seed] FHIR resources: practitioners=${loaded.practitioners.length}, patients=${loaded.patients.length}, vitals=${sanitizedVitals.length}, medications=${sanitizedMeds.length}`,
  );
  console.log(
    `[seed] Assignments: assignedPatients=${assignmentSummary.assignedPatients}, unassignedPatients=${loaded.patients.length - assignmentSummary.assignedPatients}, activeChanged=${assignmentSummary.activeAssignments}`,
  );

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

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("\n[seed] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
