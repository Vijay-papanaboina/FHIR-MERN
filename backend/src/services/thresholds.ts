/**
 * Clinical threshold rules for vital-sign Observations.
 *
 * Each rule maps a LOINC code to warning and critical bounds.
 * `evaluateObservation` uses these to determine alert severity.
 */

export type AlertSeverity = "warning" | "critical";

export interface AlertPayload {
  type: string;
  message: string;
  value: number;
  unit: string;
  severity: AlertSeverity;
  patientFhirId: string;
  observationId: string;
  recordDate: string; // effectiveDateTime from FHIR
}

interface ThresholdBounds {
  low?: number;
  high?: number;
}

interface ThresholdRule {
  loincCode: string;
  vitalName: string;
  unit: string;
  warning: ThresholdBounds;
  critical: ThresholdBounds;
}

// ── Rules ────────────────────────────────────────────────────────

const thresholdRules: ThresholdRule[] = [
  {
    loincCode: "8867-4",
    vitalName: "Heart Rate",
    unit: "bpm",
    warning: { low: 55, high: 100 },
    critical: { low: 40, high: 130 },
  },
  {
    loincCode: "59408-5",
    vitalName: "SpO2",
    unit: "%",
    warning: { low: 94 },
    critical: { low: 90 },
  },
  {
    loincCode: "8480-6",
    vitalName: "Systolic BP",
    unit: "mmHg",
    warning: { low: 90, high: 140 },
    critical: { low: 70, high: 180 },
  },
  {
    loincCode: "8310-5",
    vitalName: "Body Temperature",
    unit: "°C",
    warning: { high: 38 },
    critical: { low: 35, high: 40 },
  },
];

// ── Evaluator ────────────────────────────────────────────────────

/**
 * Check a value against threshold bounds.
 * Returns the severity and direction if the value breaches bounds.
 */
const checkBounds = (
  value: number,
  rule: ThresholdRule,
): { severity: AlertSeverity; direction: "HIGH" | "LOW" } | null => {
  const { critical, warning } = rule;

  // Critical checks (higher priority)
  if (critical.low !== undefined && value < critical.low)
    return { severity: "critical", direction: "LOW" };
  if (critical.high !== undefined && value > critical.high)
    return { severity: "critical", direction: "HIGH" };

  // Warning checks
  if (warning.low !== undefined && value < warning.low)
    return { severity: "warning", direction: "LOW" };
  if (warning.high !== undefined && value > warning.high)
    return { severity: "warning", direction: "HIGH" };

  return null;
};

/**
 * Extract a LOINC code from a FHIR Observation's `code.coding` array.
 */
const extractLoincCode = (
  observation: Record<string, unknown>,
): string | null => {
  const code = observation.code as
    | { coding?: { system?: string; code?: string }[] }
    | undefined;

  if (!code?.coding) return null;

  const loinc = code.coding.find(
    (c) => c.system === "http://loinc.org" && c.code,
  );
  return loinc?.code ?? null;
};

/**
 * Extract the numeric value from a FHIR Observation's `valueQuantity`.
 */
const extractValue = (observation: Record<string, unknown>): number | null => {
  const vq = observation.valueQuantity as { value?: number } | undefined;
  if (vq?.value === undefined || vq.value === null) return null;
  return typeof vq.value === "number" ? vq.value : null;
};

/**
 * Extract the patient FHIR ID from the Observation's `subject.reference`.
 */
const extractPatientId = (
  observation: Record<string, unknown>,
): string | null => {
  const subject = observation.subject as { reference?: string } | undefined;
  if (!subject?.reference) return null;

  const parts = subject.reference.split("/");
  // Handle both "Patient/123" and "https://fhir.example.org/Patient/123"
  if (parts.length < 2) return null;
  const resourceType = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  return resourceType === "Patient" && id ? id : null;
};

/**
 * Extract the effectiveDateTime from the Observation.
 */
const extractRecordDate = (
  observation: Record<string, unknown>,
): string | null => {
  const date = observation.effectiveDateTime as string | undefined;
  return date ?? null;
};

/**
 * Format the normal range for the alert message.
 */
const formatRange = (rule: ThresholdRule): string => {
  const { low, high } = rule.warning;
  if (low !== undefined && high !== undefined) return `${low}-${high}`;
  if (low !== undefined) return `>${low}`;
  if (high !== undefined) return `<${high}`;
  return "";
};

/**
 * Evaluate a raw FHIR Observation against the threshold rules.
 */
export const evaluateObservation = (
  observation: Record<string, unknown>,
): AlertPayload | null => {
  const loincCode = extractLoincCode(observation);
  if (!loincCode) return null;

  const rule = thresholdRules.find((r) => r.loincCode === loincCode);
  if (!rule) return null;

  const value = extractValue(observation);
  if (value === null) return null;

  const breach = checkBounds(value, rule);
  if (!breach) return null;

  const patientFhirId = extractPatientId(observation);
  if (!patientFhirId) return null;

  const observationId = String(observation.id ?? "");
  if (!observationId) return null;

  const recordDate = extractRecordDate(observation)!;

  const severityPrefix =
    breach.severity === "critical" ? "🚨 CRITICAL" : "⚠️ WARNING";
  const type = `${breach.severity.toUpperCase()}_${breach.direction}_${rule.vitalName.toUpperCase().replace(/\s+/g, "_")}`;

  const rangeStr = formatRange(rule);
  const message = `${severityPrefix} ${breach.direction} ${rule.vitalName}: ${value} ${rule.unit}${rangeStr ? ` (Normal: ${rangeStr} ${rule.unit})` : ""}`;

  return {
    type,
    message,
    value,
    unit: rule.unit,
    severity: breach.severity,
    patientFhirId,
    observationId,
    recordDate,
  };
};
