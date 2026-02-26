import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { auth } from "../config/auth.js";

// Derive role type directly from Better-Auth session inference.
// This stays in sync with `additionalFields` in auth.ts automatically.
type UserRole = (typeof auth.$Infer.Session.user)["role"];

/**
 * Middleware factory: enforces system-level user roles.
 *
 * Usage: router.get("/admin-only", requireRole("admin"), handler)
 *        router.get("/staff",       requireRole("practitioner", "admin"), handler)
 *
 * Assumes `requireAuth` has already run (req.user is set).
 * Returns 401 if user is not authenticated.
 * Returns 403 if user's role is not in the allowed list.
 */
export const requireRole =
  (...roles: [UserRole, ...UserRole[]]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(`Access denied.`, 403);
    }

    next();
  };
