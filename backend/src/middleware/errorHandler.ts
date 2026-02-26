import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

const isDev = env.NODE_ENV === "development" || env.NODE_ENV === "test";

/**
 * Global error-handling middleware.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * - Operational errors (AppError): returns the error message to the client.
 * - Unknown errors: returns a generic "Internal Server Error" (never leaks internals).
 * - In development: includes stack traces in error responses for easier debugging.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // ── Log the full error ──────────────────────────────────────
  logger.error(`${err.message}`, {
    stack: err.stack,
    correlationId: req.id,
    method: req.method,
    path: req.originalUrl,
  });

  // ── Guard: don't send if response already started ───────────
  if (res.headersSent) {
    next(err);
    return;
  }

  // ── Operational (expected) errors ───────────────────────────
  if (err instanceof AppError) {
    const { statusCode, status, message } = err;
    const base =
      status === "fail" ? jsend.fail({ message }) : jsend.error(message);

    res.status(statusCode).json(isDev ? { ...base, stack: err.stack } : base);
    return;
  }

  // ── Unknown / programming errors ────────────────────────────
  const base = jsend.error("Internal Server Error");
  res
    .status(500)
    .json(isDev ? { ...base, error: err.message, stack: err.stack } : base);
};
