import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { jsend } from "../utils/jsend.js";
import { addConnection, removeConnection } from "../services/sse.manager.js";
import {
  getAlertsForUser,
  getAlertsByPatient,
  acknowledgeAlert,
} from "../repositories/alert.repository.js";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * GET /api/alerts/stream
 * Opens a persistent SSE connection for the authenticated user.
 * Practitioners and admins only.
 */
export const sseStreamHandler = (req: Request, res: Response): void => {
  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }

  const userId = req.user.id;

  // ── SSE headers ────────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Register this connection
  addConnection(userId, res);

  // Send initial event so the client knows the stream is live
  res.write(`event: connected\n`);
  res.write(
    `data: ${JSON.stringify({ message: "SSE connection established" })}\n\n`,
  );

  // Heartbeat to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, HEARTBEAT_INTERVAL_MS);

  // Clean up on disconnect or error
  const cleanup = () => {
    clearInterval(heartbeat);
    removeConnection(userId, res);
  };

  req.on("close", cleanup);
  req.on("error", (err) => {
    logger.warn(`SSE error for user ${userId}: ${err.message}`);
    cleanup();
  });
};

// ── REST handlers ────────────────────────────────────────────────

/**
 * GET /api/alerts
 * Returns alerts sent to the current user.
 */
export const getMyAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Authentication required", 401);

    const alerts = await getAlertsForUser(userId);
    res.json(jsend.success(alerts));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/alerts/patient/:patientFhirId
 * Returns alerts for a specific patient.
 * Requires the caller to be assigned to the patient or be an admin.
 */
export const getPatientAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const patientFhirId = req.params.patientFhirId as string;
    if (!patientFhirId) throw new AppError("patientFhirId is required", 400);

    const alerts = await getAlertsByPatient(patientFhirId);
    res.json(jsend.success(alerts));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/alerts/:id/acknowledge
 * Marks an alert as acknowledged by the current user.
 */
export const acknowledgeAlertHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Authentication required", 401);

    const id = req.params.id as string;
    if (!id) throw new AppError("Alert ID is required", 400);

    const alert = await acknowledgeAlert(id, userId);
    if (!alert) throw new AppError("Alert not found", 404);

    // Only recipients of the alert (or admins) can acknowledge it
    const isRecipient = alert.sentToUserIds.includes(userId);
    const isAdmin = req.user?.role === "admin";
    if (!isRecipient && !isAdmin) {
      throw new AppError("You are not a recipient of this alert", 403);
    }

    res.json(jsend.success(alert));
  } catch (err) {
    next(err);
  }
};
