import type { Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { Alert } from "../models/alert.model.js";
import { evaluateObservation } from "./thresholds.js";
import { getAssignmentsByPatient } from "../repositories/assignment.repository.js";
import { User } from "../models/auth.model.js";
import { sendToUsers, type SseEvent } from "./sse.manager.js";

/**
 * Webhook handler for FHIR Subscription notifications.
 *
 * HAPI FHIR POSTs to this handler whenever an Observation is created/updated.
 * Flow:
 *   1. Parse the incoming Observation
 *   2. Check for duplicate (observationId already has an alert)
 *   3. Evaluate against threshold rules
 *   4. Find recipients (assigned primary+covering practitioners + admins)
 *   5. Save Alert to MongoDB
 *   6. Push SSE event to recipients
 */
export const handleObservationWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Always respond 200 quickly so HAPI doesn't retry
  res.status(200).json({ received: true });

  try {
    const observation = req.body as Record<string, unknown>;

    // Validate it's an Observation
    if (observation.resourceType !== "Observation") {
      return;
    }

    const observationId = String(observation.id ?? "");
    if (!observationId) return;

    // 1. Evaluate against thresholds
    const alertPayload = evaluateObservation(observation);
    if (!alertPayload) return;

    // 2. Find recipients
    const [assignments, admins] = await Promise.all([
      getAssignmentsByPatient(alertPayload.patientFhirId, true),
      User.find({ role: "admin" }, { _id: 1 }).lean(),
    ]);

    // Only primary + covering practitioners (not consulting)
    const practitionerIds = assignments
      .filter((a) => a.assignmentRole !== "consulting")
      .map((a) => a.assignedUserId);

    const adminIds = admins.map((a) => a._id.toString());

    // Deduplicate in case an admin is also assigned
    const recipientIds = [...new Set([...practitionerIds, ...adminIds])];

    if (recipientIds.length === 0) {
      logger.info(
        `Alert triggered for patient ${alertPayload.patientFhirId} but no recipients found`,
      );
      return;
    }

    // 3. Validate recordDate
    const recordDate = alertPayload.recordDate
      ? new Date(alertPayload.recordDate)
      : null;
    if (!recordDate || isNaN(recordDate.getTime())) {
      logger.warn(
        `Observation ${observationId} has invalid or missing effectiveDateTime, skipping alert`,
      );
      return;
    }

    // 4. Save alert (unique index on observationId handles dedup)
    let alert;
    try {
      alert = await Alert.create({
        patientFhirId: alertPayload.patientFhirId,
        observationId: alertPayload.observationId,
        type: alertPayload.type,
        message: alertPayload.message,
        value: alertPayload.value,
        unit: alertPayload.unit,
        severity: alertPayload.severity,
        sentToUserIds: recipientIds,
        recordDate,
      });
    } catch (createErr: unknown) {
      // Duplicate observationId — another request already created this alert
      if (
        createErr instanceof Error &&
        "code" in createErr &&
        (createErr as { code: number }).code === 11000
      ) {
        return;
      }
      throw createErr;
    }

    // 5. Push SSE event
    const sseEvent: SseEvent = {
      event: "alert",
      data: {
        id: alert._id,
        patientFhirId: alert.patientFhirId,
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
  } catch (err) {
    // Log but don't crash — HAPI already got 200
    logger.error(
      `Webhook processing error: %s`,
      err instanceof Error ? err.message : String(err),
    );
  }
};
