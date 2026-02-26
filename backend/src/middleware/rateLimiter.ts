import type { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";

import { logger } from "../utils/logger.js";

const isDev = process.env["NODE_ENV"] === "development";
const disableRateLimit = process.env["DISABLE_RATE_LIMIT"] === "true";

// In development, allow bypassing rate limiting only if explicitly requested
const bypassActive = isDev && disableRateLimit;

if (bypassActive) {
  logger.warn("Rate limiting is DISABLED via DISABLE_RATE_LIMIT flag.");
}

const bypass = (_req: Request, _res: Response, next: NextFunction) => next();

// Global rate limiter for non-auth routes
export const globalLimiter = bypassActive
  ? bypass
  : rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      limit: 100, // 100 requests per window per IP
      standardHeaders: "draft-8",
      legacyHeaders: false,
      ipv6Subnet: 56,
      message: {
        status: "error",
        message: "Too many requests, please try again later.",
      },
    });

// Stricter rate limiter for auth routes (login, signup, etc.)
// Always enabled, even in development, to prevent brute force testing issues
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 requests per window per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
  message: {
    status: "error",
    message: "Too many auth requests, please try again later.",
  },
});
