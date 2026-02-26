import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware to verify the X-Webhook-Secret header on incoming
 * FHIR Subscription notifications.
 *
 * If WEBHOOK_SECRET is not configured, all requests are allowed
 * (development mode).
 */
export const verifyWebhookSecret = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const secret = env.WEBHOOK_SECRET;

  // If no secret configured, skip verification (dev mode)
  if (!secret) {
    return next();
  }

  const provided = req.headers["x-webhook-secret"];

  if (provided !== secret) {
    logger.warn(
      `Webhook auth failed from ${req.ip} — invalid or missing X-Webhook-Secret`,
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
