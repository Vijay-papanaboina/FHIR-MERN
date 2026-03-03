import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  loadSyntheaDataFromZip,
  type FhirAllergyIntolerance,
  type FhirDiagnosticReport,
  type FhirObservation,
} from "./seed-fhir.synthea.js";
import {
  createRng,
  referenceResourceId,
  sampleByPatient,
  sampleByPatientId,
  subjectPatientId,
} from "./seed-fhir.util.js";
import { parseConfig } from "./seed-fhir.config.js";
import { postTransactionInChunks, toPutEntry } from "./seed-fhir.fhir.js";
import {
  printSeedCredentials,
  seedAssignments,
  seedUsers,
} from "./seed-fhir.mongo.js";
import {
  collectDiagnosticResultObservationIds,
  isVitalObservation,
  sampleDiagnosticObservationIds,
  sanitizeObservationResource,
  sanitizeVitalObservationResource,
} from "./seed-resource-observation.js";
import { sanitizeMedicationResource } from "./seed-resource-medication.js";
import { sanitizeConditionResource } from "./seed-resource-condition.js";
import { sanitizeAllergyResource } from "./seed-resource-allergy.js";
import { sanitizeDiagnosticReportResource } from "./seed-resource-diagnostic-report.js";

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

const mapById = <T extends { id: string }>(list: T[]): Map<string, T> => {
  const out = new Map<string, T>();
  for (const item of list) {
    if (item?.id) out.set(item.id, item);
  }
  return out;
};

const mergeResources = (
  target: Map<string, Record<string, unknown>>,
  resources: Array<Record<string, unknown>>,
): void => {
  for (const resource of resources) {
    const type = String(resource.resourceType ?? "");
    const id = String(resource.id ?? "");
    if (!type || !id) continue;
    target.set(`${type}/${id}`, resource);
  }
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

  const conditions = sampleByPatient(
    loaded.conditions,
    patientIdSet,
    (rng) => rng.int(cfg.minConditionsPerPatient, cfg.maxConditionsPerPatient),
    `${cfg.seedKey}:conditions`,
  );

  const allergies = sampleByPatientId(
    loaded.allergies,
    patientIdSet,
    (allergy: FhirAllergyIntolerance) =>
      referenceResourceId(allergy.patient?.reference, "Patient"),
    (rng) => rng.int(cfg.minAllergiesPerPatient, cfg.maxAllergiesPerPatient),
    `${cfg.seedKey}:allergies`,
  );

  const diagnosticReports = sampleByPatient(
    loaded.diagnosticReports,
    patientIdSet,
    (rng) =>
      rng.int(cfg.minDiagnosticsPerPatient, cfg.maxDiagnosticsPerPatient),
    `${cfg.seedKey}:diagnostic-reports`,
  );

  console.log(
    `[seed] Selected resources: practitioners=${loaded.practitioners.length}, patients=${loaded.patients.length}, vitals=${vitals.length}, meds=${meds.length}, conditions=${conditions.length}, allergies=${allergies.length}, diagnostics=${diagnosticReports.length}`,
  );

  const fallbackPractitionerId = loaded.practitioners[0]?.id;
  if (!fallbackPractitionerId) {
    throw new Error(
      "No practitioner available for medication requester fallback",
    );
  }

  const sanitizedVitals = vitals
    .map((o) =>
      sanitizeVitalObservationResource(o as unknown as Record<string, unknown>),
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

  const sanitizedConditions = conditions
    .map((c) =>
      sanitizeConditionResource(c as unknown as Record<string, unknown>),
    )
    .filter((item): item is Record<string, unknown> => !!item);

  const sanitizedAllergies = allergies
    .map((a) =>
      sanitizeAllergyResource(a as unknown as Record<string, unknown>),
    )
    .filter((item): item is Record<string, unknown> => !!item);

  const observationById = mapById(Object.values(loaded.observationIndex ?? {}));
  const rawDiagnosticObservationIds = Array.from(
    collectDiagnosticResultObservationIds(
      diagnosticReports as FhirDiagnosticReport[],
    ),
  );

  const observationIdToPatientId = (id: string): string | null => {
    const obs = observationById.get(id);
    if (!obs) return null;
    return subjectPatientId(obs.subject?.reference);
  };

  const allowedDiagnosticObservationIds = sampleDiagnosticObservationIds(
    rawDiagnosticObservationIds,
    () => cfg.maxDiagnosticObservationsPerPatient,
    observationIdToPatientId,
    (seed) => createRng(seed),
    `${cfg.seedKey}:diagnostic-observations`,
  );

  const diagnosticObservationResources = Array.from(
    allowedDiagnosticObservationIds,
  )
    .map((id) => observationById.get(id))
    .filter((item): item is FhirObservation => !!item)
    .map((obs) =>
      sanitizeObservationResource(obs as unknown as Record<string, unknown>),
    )
    .filter((item): item is Record<string, unknown> => !!item);

  const includedDiagnosticObservationIds = new Set(
    diagnosticObservationResources
      .map((obs) => String(obs.id ?? "").trim())
      .filter((id) => id.length > 0),
  );

  const sanitizedDiagnosticReports = diagnosticReports
    .map((r) =>
      sanitizeDiagnosticReportResource(
        r as unknown as Record<string, unknown>,
        includedDiagnosticObservationIds,
      ),
    )
    .filter((item): item is Record<string, unknown> => !!item);

  const resourceMap = new Map<string, Record<string, unknown>>();
  mergeResources(
    resourceMap,
    loaded.practitioners.map((p) => p as unknown as Record<string, unknown>),
  );
  mergeResources(
    resourceMap,
    loaded.patients.map((p) => p as unknown as Record<string, unknown>),
  );
  mergeResources(resourceMap, sanitizedVitals);
  mergeResources(resourceMap, sanitizedMeds);
  mergeResources(resourceMap, sanitizedConditions);
  mergeResources(resourceMap, sanitizedAllergies);
  mergeResources(resourceMap, diagnosticObservationResources);
  mergeResources(resourceMap, sanitizedDiagnosticReports);

  const fhirEntries = Array.from(resourceMap.values()).map((r) =>
    toPutEntry(r),
  );

  await postTransactionInChunks(FHIR_BASE_URL, FHIR_SECRET, fhirEntries);

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
    `[seed] FHIR resources: practitioners=${loaded.practitioners.length}, patients=${loaded.patients.length}, vitals=${sanitizedVitals.length}, medications=${sanitizedMeds.length}, conditions=${sanitizedConditions.length}, allergies=${sanitizedAllergies.length}, diagnostics=${sanitizedDiagnosticReports.length}, diagnosticObservations=${diagnosticObservationResources.length}`,
  );
  console.log(
    `[seed] Assignments: assignedPatients=${assignmentSummary.assignedPatients}, unassignedPatients=${loaded.patients.length - assignmentSummary.assignedPatients}, activeChanged=${assignmentSummary.activeAssignments}`,
  );

  printSeedCredentials(users);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("\n[seed] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
