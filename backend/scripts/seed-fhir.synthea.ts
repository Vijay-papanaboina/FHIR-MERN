import { mkdir, readdir, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { subjectPatientId } from "./seed-fhir.util.js";

const execFileAsync = promisify(execFile);

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  name?: Array<{ given?: string[]; family?: string }>;
  gender?: string;
  birthDate?: string;
}

export interface FhirPractitioner {
  resourceType: "Practitioner";
  id: string;
  name?: Array<{ given?: string[]; family?: string }>;
}

export interface FhirObservation {
  resourceType: "Observation";
  id: string;
  subject?: { reference?: string };
  category?: Array<{ coding?: Array<{ code?: string }> }>;
}

export interface FhirMedicationRequest {
  resourceType: "MedicationRequest";
  id: string;
  subject?: { reference?: string };
}

interface FhirBundleLike {
  resourceType?: string;
  entry?: Array<{ resource?: Record<string, unknown> }>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const listJsonFiles = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        out.push(fullPath);
      }
    }
  }

  out.sort();
  return out;
};

const downloadZip = async (zipUrl: string, zipPath: string): Promise<void> => {
  const res = await fetch(zipUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download Synthea zip: ${res.status}`);
  }

  const file = createWriteStream(zipPath);
  await pipeline(Readable.fromWeb(res.body as never), file);
};

const extractZip = async (
  zipPath: string,
  extractDir: string,
): Promise<void> => {
  await mkdir(extractDir, { recursive: true });
  await execFileAsync("unzip", ["-oq", zipPath, "-d", extractDir]);
};

const extractResourcesFromJson = (raw: unknown): Record<string, unknown>[] => {
  if (!isObject(raw)) return [];

  if (raw.resourceType === "Bundle") {
    const bundle = raw as FhirBundleLike;
    const entry = Array.isArray(bundle.entry) ? bundle.entry : [];
    return entry
      .map((item) => item.resource)
      .filter((resource): resource is Record<string, unknown> =>
        isObject(resource),
      );
  }

  if (typeof raw.resourceType === "string") {
    return [raw as Record<string, unknown>];
  }

  return [];
};

export const loadSyntheaDataFromZip = async (
  zipUrl: string,
  zipPath: string,
  extractDir: string,
  maxPatients: number,
  maxPractitioners: number,
): Promise<{
  patients: FhirPatient[];
  practitioners: FhirPractitioner[];
  observations: FhirObservation[];
  medications: FhirMedicationRequest[];
}> => {
  await downloadZip(zipUrl, zipPath);
  await extractZip(zipPath, extractDir);

  const files = await listJsonFiles(extractDir);

  const patientMap = new Map<string, FhirPatient>();
  const practitionerMap = new Map<string, FhirPractitioner>();
  const observations: FhirObservation[] = [];
  const medications: FhirMedicationRequest[] = [];

  // Pass 1: pick target patients and collect practitioners opportunistically.
  for (const file of files) {
    const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
    const resources = extractResourcesFromJson(parsed);

    const patientResources = resources.filter(
      (r): r is FhirPatient =>
        r.resourceType === "Patient" && typeof r.id === "string",
    );

    for (const patient of patientResources) {
      if (patientMap.size >= maxPatients) break;
      if (patientMap.has(patient.id)) continue;
      patientMap.set(patient.id, patient);
    }

    for (const resource of resources) {
      if (
        resource.resourceType === "Practitioner" &&
        typeof resource.id === "string"
      ) {
        if (practitionerMap.size < maxPractitioners) {
          practitionerMap.set(resource.id, resource as FhirPractitioner);
        }
      }
    }

    if (
      patientMap.size >= maxPatients &&
      practitionerMap.size >= maxPractitioners
    ) {
      break;
    }
  }

  // Pass 2: collect clinical resources for selected patients.
  const selectedPatientIds = new Set(patientMap.keys());
  for (const file of files) {
    const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
    const resources = extractResourcesFromJson(parsed);

    for (const resource of resources) {
      if (
        resource.resourceType === "Practitioner" &&
        typeof resource.id === "string" &&
        practitionerMap.size < maxPractitioners
      ) {
        practitionerMap.set(resource.id, resource as FhirPractitioner);
      }

      if (
        resource.resourceType === "Observation" &&
        typeof resource.id === "string"
      ) {
        const patientId = subjectPatientId(
          (resource.subject as { reference?: string } | undefined)?.reference,
        );
        if (patientId && selectedPatientIds.has(patientId)) {
          observations.push(resource as FhirObservation);
        }
      }

      if (
        resource.resourceType === "MedicationRequest" &&
        typeof resource.id === "string"
      ) {
        const patientId = subjectPatientId(
          (resource.subject as { reference?: string } | undefined)?.reference,
        );
        if (patientId && selectedPatientIds.has(patientId)) {
          medications.push(resource as FhirMedicationRequest);
        }
      }
    }
  }

  const practitioners = Array.from(practitionerMap.values());
  while (practitioners.length < maxPractitioners) {
    const n = practitioners.length + 1;
    practitioners.push({
      resourceType: "Practitioner",
      id: `seed-fhir-pract-${String(n).padStart(2, "0")}`,
      name: [{ given: ["Seed"], family: `Practitioner${n}` }],
    });
  }

  return {
    patients: Array.from(patientMap.values()),
    practitioners: practitioners.slice(0, maxPractitioners),
    observations,
    medications,
  };
};
