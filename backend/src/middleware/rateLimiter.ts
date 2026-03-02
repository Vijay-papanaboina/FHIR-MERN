import type { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const isDev = env.NODE_ENV === "development";
const isTest = env.NODE_ENV === "test";
const isProduction = env.NODE_ENV === "production";

// In development, allow bypassing rate limiting only if explicitly requested
const bypassActive = isDev && env.DISABLE_RATE_LIMIT === true;
const globalRateLimitEnabled =
  env.GLOBAL_RATE_LIMIT_ENABLED ?? (isTest ? false : true);
const globalRateLimitWindowSeconds = env.GLOBAL_RATE_LIMIT_WINDOW ?? 60;
const globalRateLimitMax =
  env.GLOBAL_RATE_LIMIT_MAX ?? (isProduction ? 100 : 300);

if (bypassActive) {
  logger.warn("Rate limiting is DISABLED via DISABLE_RATE_LIMIT flag.");
}

const bypass = (_req: Request, _res: Response, next: NextFunction) => next();

// Global rate limiter for non-auth routes
export const globalLimiter =
  bypassActive || !globalRateLimitEnabled
    ? bypass
    : rateLimit({
        windowMs: globalRateLimitWindowSeconds * 1000,
        limit: globalRateLimitMax,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        ipv6Subnet: 56,
        message: {
          status: "error",
          message: "Too many requests, please try again later.",
        },
      });
