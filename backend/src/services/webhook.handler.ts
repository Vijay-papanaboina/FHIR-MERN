import type { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { Alert } from "../models/alert.model.js";
import { evaluateObservation } from "./thresholds.js";
import { getAssignmentsByPatient } from "../repositories/assignment.repository.js";
import { User } from "../models/auth.model.js";
import { sendToUsers, type SseEvent } from "./sse.manager.js";
import { extractObservationDisplay } from "../repositories/diagnostic-observation.repository.js";

interface AlertCreatePayload {
  patientFhirId: string;
  observationId: string;
  type: string;
  message: string;
  value: number;
  unit: string;
  severity: "warning" | "critical";
  recordDate: Date;
}

const FINAL_DIAGNOSTIC_REPORT_STATUSES = new Set([
  "final",
  "amended",
  "corrected",
]);

const parsePatientIdFromReference = (reference: string): string | null => {
  const [resourceType, id] = reference.split("/");
  if (resourceType !== "Patient" || !id) return null;
  return id;
};

const getPatientIdFromSubject = (
  resource: Record<string, unknown>,
): string | null => {
  const subjectValue = resource["subject"];
  const reference =
    subjectValue && typeof subjectValue === "object"
      ? (subjectValue as { reference?: unknown }).reference
      : undefined;

  if (typeof reference !== "string") return null;
  return parsePatientIdFromReference(reference);
};

const getResourceDate = (
  resource: Record<string, unknown>,
): Date | undefined => {
  const candidates = [
    resource["effectiveDateTime"],
    resource["issued"],
    resource["meta"] && typeof resource["meta"] === "object"
      ? (resource["meta"] as { lastUpdated?: unknown }).lastUpdated
      : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return undefined;
};

const hasCategoryCode = (
  resource: Record<string, unknown>,
  categoryCode: string,
): boolean => {
  const category = resource["category"];
  if (!Array.isArray(category)) return false;

  return category.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const coding = (entry as { coding?: Array<{ code?: unknown }> }).coding;
    return Array.isArray(coding)
      ? coding.some((item) => item?.code === categoryCode)
      : false;
  });
};

const getDiagnosticReportDisplay = (
  report: Record<string, unknown>,
): string => {
  const code = report["code"];
  const text =
    code && typeof code === "object"
      ? (code as { text?: unknown }).text
      : undefined;
  if (typeof text === "string" && text.trim().length > 0) return text.trim();

  const coding =
    code && typeof code === "object"
      ? (code as { coding?: Array<{ display?: unknown; code?: unknown }> })
          .coding
      : undefined;
  const display = coding?.[0]?.display;
  if (typeof display === "string" && display.trim().length > 0) {
    return display.trim();
  }

  const fallbackCode = coding?.[0]?.code;
  if (typeof fallbackCode === "string" && fallbackCode.trim().length > 0) {
    return fallbackCode.trim();
  }

  return "Diagnostic report";
};

const resolveRecipients = async (
  patientFhirId: string,
  includeConsulting: boolean,
): Promise<string[]> => {
  const [assignments, admins] = await Promise.all([
    getAssignmentsByPatient(patientFhirId, true),
    User.find({ role: "admin" }, { _id: 1 }).lean(),
  ]);

  const practitionerIds = assignments
    .filter((assignment) =>
      includeConsulting ? true : assignment.assignmentRole !== "consulting",
    )
    .map((assignment) => assignment.assignedUserId.toString());
  const adminIds = admins.map((admin) => admin._id.toString());

  return [...new Set([...practitionerIds, ...adminIds])];
};

const createAndDispatchAlert = async (
  payload: AlertCreatePayload,
  recipientIds: string[],
): Promise<void> => {
  if (recipientIds.length === 0) return;

  let alert;
  try {
    alert = await Alert.create({
      patientFhirId: payload.patientFhirId,
      observationId: payload.observationId,
      type: payload.type,
      message: payload.message,
      value: payload.value,
      unit: payload.unit,
      severity: payload.severity,
      sentToUserIds: recipientIds,
      recordDate: payload.recordDate,
    });
  } catch (createErr: unknown) {
    if (
      createErr instanceof Error &&
      "code" in createErr &&
      (createErr as { code: number }).code === 11000
    ) {
      return;
    }
    throw createErr;
  }

  const sseEvent: SseEvent = {
    event: "alert",
    data: {
      id: alert._id,
      patientFhirId: alert.patientFhirId,
      observationId: alert.observationId,
      type: alert.type,
      message: alert.message,
      value: alert.value,
      unit: alert.unit,
      severity: alert.severity,
      recordDate: alert.recordDate,
      createdAt: alert.createdAt,
    },
  };

  sendToUsers(recipientIds, sseEvent);
  logger.info(
    `Alert dispatched: ${alert.type} (obs: ${alert.observationId}) for patient ${alert.patientFhirId} → ${recipientIds.length} recipients`,
  );
};

const handleVitalObservation = async (
  observation: Record<string, unknown>,
): Promise<void> => {
  const observationId = String(observation.id ?? "");
  if (!observationId) return;

  const alertPayload = evaluateObservation(observation);
  if (!alertPayload) return;

  const recordDate = alertPayload.recordDate
    ? new Date(alertPayload.recordDate)
    : null;
  if (!recordDate || Number.isNaN(recordDate.getTime())) {
    logger.warn(
      `Observation ${observationId} has invalid or missing effectiveDateTime, skipping alert`,
    );
    return;
  }

  const recipientIds = await resolveRecipients(
    alertPayload.patientFhirId,
    false,
  );
  if (recipientIds.length === 0) {
    logger.info(
      `Alert triggered for patient ${alertPayload.patientFhirId} but no recipients found`,
    );
    return;
  }

  await createAndDispatchAlert(
    {
      patientFhirId: alertPayload.patientFhirId,
      observationId: alertPayload.observationId,
      type: alertPayload.type,
      message: alertPayload.message,
      value: alertPayload.value,
      unit: alertPayload.unit,
      severity: alertPayload.severity,
      recordDate,
    },
    recipientIds,
  );
};

const handleDiagnosticObservation = async (
  observation: Record<string, unknown>,
): Promise<void> => {
  if (!hasCategoryCode(observation, "laboratory")) return;

  const observationId = String(observation.id ?? "").trim();
  if (!observationId) return;

  const patientFhirId = getPatientIdFromSubject(observation);
  if (!patientFhirId) return;

  const quantity =
    observation["valueQuantity"] &&
    typeof observation["valueQuantity"] === "object"
      ? (observation["valueQuantity"] as { value?: unknown; unit?: unknown })
      : undefined;
  const valueAsNumber =
    typeof quantity?.value === "number"
      ? quantity.value
      : Number(quantity?.value ?? Number.NaN);
  const unit =
    typeof quantity?.unit === "string" && quantity.unit.trim().length > 0
      ? quantity.unit.trim()
      : "n/a";

  const recipientIds = await resolveRecipients(patientFhirId, true);
  if (recipientIds.length === 0) return;
  const recordDate = getResourceDate(observation);
  if (!recordDate) {
    logger.warn(
      `Diagnostic observation ${observationId} has no valid timestamp, skipping alert`,
    );
    return;
  }

  await createAndDispatchAlert(
    {
      patientFhirId,
      observationId: `diagnostic-observation:${observationId}`,
      type: "DIAGNOSTIC_RESULT_POSTED",
      message: `Diagnostic result posted: ${extractObservationDisplay(observation)}`,
      value: Number.isFinite(valueAsNumber) ? valueAsNumber : 0,
      unit,
      severity: "warning",
      recordDate,
    },
    recipientIds,
  );
};

const handleDiagnosticReport = async (
  report: Record<string, unknown>,
): Promise<void> => {
  const reportId = String(report.id ?? "").trim();
  if (!reportId) return;

  const status = String(report.status ?? "")
    .trim()
    .toLowerCase();
  if (!FINAL_DIAGNOSTIC_REPORT_STATUSES.has(status)) return;

  const patientFhirId = getPatientIdFromSubject(report);
  if (!patientFhirId) return;

  const recipientIds = await resolveRecipients(patientFhirId, true);
  if (recipientIds.length === 0) return;
  const recordDate = getResourceDate(report);
  if (!recordDate) {
    logger.warn(
      `Diagnostic report ${reportId} has no valid timestamp, skipping alert`,
    );
    return;
  }

  await createAndDispatchAlert(
    {
      patientFhirId,
      observationId: `diagnostic-report:${reportId}:${status}`,
      type: "DIAGNOSTIC_REPORT_AVAILABLE",
      message: `Diagnostic report available: ${getDiagnosticReportDisplay(report)}`,
      value: 0,
      unit: "n/a",
      severity: "warning",
      recordDate,
    },
    recipientIds,
  );
};

export const handleObservationWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Always respond 200 quickly so HAPI doesn't retry
  res.status(200).json({ received: true });

  try {
    const resource = req.body as Record<string, unknown>;
    const resourceType = resource["resourceType"];

    if (resourceType === "Observation") {
      await handleVitalObservation(resource);
      await handleDiagnosticObservation(resource);
      return;
    }

    if (resourceType === "DiagnosticReport") {
      await handleDiagnosticReport(resource);
      return;
    }
  } catch (err) {
    // Log but don't crash — HAPI already got 200
    logger.error(
      `Webhook processing error: %s`,
      err instanceof Error ? (err.stack ?? err.message) : String(err),
    );
  }
};
