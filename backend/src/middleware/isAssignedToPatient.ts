import type { Request, Response, NextFunction } from "express";
import type {
  IAssignment,
  AssignmentRole,
} from "../models/assignment.model.js";
import { findActiveAssignment } from "../repositories/assignment.repository.js";
import { AppError } from "../utils/AppError.js";

// ── Augment Express Request to carry the resolved assignment ─────
declare global {
  namespace Express {
    interface Request {
      assignment?: IAssignment;
    }
  }
}

/** Options for the isAssignedToPatient middleware. */
interface AssignmentMiddlewareOptions {
  /** Route param name that holds the patient FHIR ID. Defaults to `"id"`. */
  paramName?: string;
}

/**
 * Middleware factory: enforces patient assignment checks.
 *
 * Usage:
 *   // Any active assignment role, param defaults to :id
 *   isAssignedToPatient()
 *
 *   // Restrict to specific assignment roles
 *   isAssignedToPatient("primary", "covering")
 *
 *   // Custom param name (e.g. for :patientFhirId)
 *   isAssignedToPatient({ paramName: "patientFhirId" })
 *
 *   // Both roles and custom param
 *   isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" })
 *
 * Behaviour:
 *   - Admin users bypass all checks entirely and `req.assignment` is NOT populated.
 *     Downstream handlers must not assume `req.assignment` exists for admin requests.
 *   - Reads the patient FHIR ID from `req.params[paramName]` (default: `"id"`).
 *   - Queries the Assignment collection for an active record for this user + patient.
 *   - If `assignmentRoles` are provided, also validates the assignment role is in the list.
 *   - On success, attaches the found assignment to `req.assignment`.
 *   - Throws 401 if user is not authenticated.
 *   - Throws 400 if the route param is missing.
 *   - Throws 403 if no valid assignment is found.
 *
 * Assumes `requireAuth` and `requireRole` have already run.
 */
export const isAssignedToPatient =
  (...args: (AssignmentRole | AssignmentMiddlewareOptions)[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Separate roles from options object (last arg may be options)
      let options: AssignmentMiddlewareOptions = {};
      const assignmentRoles: AssignmentRole[] = [];

      for (const arg of args) {
        if (typeof arg === "string") {
          assignmentRoles.push(arg);
        } else {
          options = arg;
        }
      }

      const paramName = options.paramName ?? "id";

      // Admins bypass all assignment checks
      if (req.user?.role === "admin") {
        return next();
      }

      const rawId = req.params[paramName];
      if (!rawId) {
        throw new AppError(`Missing route param: ${paramName}`, 400);
      }
      const patientFhirId = String(rawId);

      const assignedUserId = req.user?.id;
      if (!assignedUserId) {
        throw new AppError("Authentication required", 401);
      }

      const assignment = await findActiveAssignment(
        patientFhirId,
        assignedUserId,
        assignmentRoles.length > 0 ? assignmentRoles : undefined,
      );

      if (!assignment) {
        const roleMsg =
          assignmentRoles.length > 0
            ? ` with role [${assignmentRoles.join(", ")}]`
            : "";
        throw new AppError(
          `Access denied. No active assignment${roleMsg} found for this patient.`,
          403,
        );
      }

      // Attach to request for downstream use (e.g., audit logging)
      req.assignment = assignment;
      return next();
    } catch (err) {
      next(err);
    }
  };
