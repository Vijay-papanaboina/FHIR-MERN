import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../config/auth.js";
import { requireAuth } from "../middleware/authGuard.js";
import { logger } from "../utils/logger.js";
import { jsend } from "../utils/jsend.js";

const router = Router();

// ── Custom Auth Routes ──────────────────────────────────────────

/**
 * GET /api/auth/me
 * Returns the current authenticated user session and role.
 */
router.get("/me", requireAuth, (req, res) => {
  if (req.user?.role) {
    logger.info(`User role found: ${req.user.role}`);
    res.json(jsend.success(req.user));
  } else {
    logger.error(
      `User role not found for user id: ${req.user?.id ?? "unknown"}`,
    );
    res.status(500).json(jsend.error("User role not found"));
  }
});

// ── Better-Auth Catch-all ───────────────────────────────────────

let authHandler: ReturnType<typeof toNodeHandler>;

/**
 * Better-Auth internal routes handler.
 * Catch-all for sign-in, sign-up, session, etc.
 * MUST NOT have requireAuth applied globally.
 */
router.all("{/*any}", (req, res) => {
  if (!authHandler) authHandler = toNodeHandler(auth);
  return authHandler(req, res);
});

export default router;
