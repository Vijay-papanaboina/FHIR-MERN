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

/**
 * Middleware factory: enforces patient assignment checks.
 *
 * Usage:
 *   // Any active assignment role
 *   router.get("/:id/vitals", requireAuth, requireRole("practitioner","admin"), isAssignedToPatient(), handler)
 *
 *   // Restrict to specific assignment roles
 *   router.post("/:id/vitals", requireAuth, requireRole("practitioner","admin"), isAssignedToPatient("primary","covering"), handler)
 *
 * Behaviour:
 *   - Admin users bypass all checks entirely and `req.assignment` is NOT populated.
 *     Downstream handlers must not assume `req.assignment` exists for admin requests.
 *   - Reads `req.params.id` as the patientFhirId.
 *   - Queries the Assignment collection for an active record for this user + patient.
 *   - If `assignmentRoles` are provided, also validates the assignment role is in the list.
 *   - On success, attaches the found assignment to `req.assignment`.
 *   - Throws 401 if user is not authenticated.
 *   - Throws 400 if the route has no :id param.
 *   - Throws 403 if no valid assignment is found.
 *
 * Assumes `requireAuth` and `requireRole` have already run.
 */
export const isAssignedToPatient =
  (...assignmentRoles: AssignmentRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Admins bypass all assignment checks
      if (req.user?.role === "admin") {
        return next();
      }

      const rawId = req.params.id;
      if (!rawId) {
        throw new AppError("Missing patient id", 400);
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
      next();
    } catch (err) {
      next(err);
    }
  };
