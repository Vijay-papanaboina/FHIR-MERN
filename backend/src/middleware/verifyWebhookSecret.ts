import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { jsend } from "../utils/jsend.js";

let warnedMissingSecret = false;

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
    if (!warnedMissingSecret) {
      logger.warn(
        "WEBHOOK_SECRET not set — skipping webhook verification. Insecure in production.",
      );
      warnedMissingSecret = true;
    }
    return next();
  }

  const provided = req.headers["x-webhook-secret"];

  // Must be a single string header
  if (typeof provided !== "string") {
    logger.warn(
      `Webhook auth failed from ${req.ip} — missing X-Webhook-Secret`,
    );
    res.status(401).json(jsend.error("Unauthorized"));
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);

  if (
    secretBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(secretBuf, providedBuf)
  ) {
    logger.warn(
      `Webhook auth failed from ${req.ip} — invalid X-Webhook-Secret`,
    );
    res.status(401).json(jsend.error("Unauthorized"));
    return;
  }

  next();
};
