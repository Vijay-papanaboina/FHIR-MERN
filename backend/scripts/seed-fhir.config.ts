export interface SeedConfig {
  admins: number;
  practitioners: number;
  patients: number;
  assignedPatientRatio: number;
  vitalsPerPatient: number;
  minMedsPerPatient: number;
  maxMedsPerPatient: number;
  minConditionsPerPatient: number;
  maxConditionsPerPatient: number;
  minAllergiesPerPatient: number;
  maxAllergiesPerPatient: number;
  minDiagnosticsPerPatient: number;
  maxDiagnosticsPerPatient: number;
  maxDiagnosticObservationsPerPatient: number;
  emailDomain: string;
  seedKey: string;
  defaultPassword: string;
  syntheaZipUrl: string;
  syntheaZipPath: string;
  syntheaExtractDir: string;
}

const parseIntArg = (name: string, fallback: number): number => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const parsed = Number.parseInt(arg.slice(name.length + 3), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const boundedMinMax = (minArg: number, maxArg: number, maxCap: number) => {
  const min = Math.max(1, Math.min(minArg, maxCap));
  const max = Math.max(min, Math.min(maxArg, maxCap));
  return { min, max };
};

export const parseConfig = (): SeedConfig => {
  const admins = parseIntArg("admins", 2);
  const practitioners = parseIntArg("practitioners", 10);
  const patients = parseIntArg("patients", 40);
  const vitalsPerPatient = parseIntArg("vitalsPerPatient", 24);
  const meds = boundedMinMax(
    parseIntArg("minMedsPerPatient", 3),
    parseIntArg("maxMedsPerPatient", 5),
    20,
  );
  const conditions = boundedMinMax(
    parseIntArg("minConditionsPerPatient", 2),
    parseIntArg("maxConditionsPerPatient", 5),
    20,
  );
  const allergies = boundedMinMax(
    parseIntArg("minAllergiesPerPatient", 1),
    parseIntArg("maxAllergiesPerPatient", 3),
    10,
  );
  const diagnostics = boundedMinMax(
    parseIntArg("minDiagnosticsPerPatient", 1),
    parseIntArg("maxDiagnosticsPerPatient", 4),
    20,
  );

  return {
    admins: Math.max(1, Math.min(admins, 5)),
    practitioners: Math.max(1, Math.min(practitioners, 30)),
    patients: Math.max(1, Math.min(patients, 200)),
    assignedPatientRatio: 0.75,
    vitalsPerPatient: Math.max(1, Math.min(vitalsPerPatient, 100)),
    minMedsPerPatient: meds.min,
    maxMedsPerPatient: meds.max,
    minConditionsPerPatient: conditions.min,
    maxConditionsPerPatient: conditions.max,
    minAllergiesPerPatient: allergies.min,
    maxAllergiesPerPatient: allergies.max,
    minDiagnosticsPerPatient: diagnostics.min,
    maxDiagnosticsPerPatient: diagnostics.max,
    maxDiagnosticObservationsPerPatient: Math.max(
      1,
      Math.min(parseIntArg("maxDiagnosticObservationsPerPatient", 20), 100),
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
