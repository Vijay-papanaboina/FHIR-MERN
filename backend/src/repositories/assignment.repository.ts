import {
  Assignment,
  type IAssignment,
  type AssignmentRole,
} from "../models/assignment.model.js";

// ── Types ────────────────────────────────────────────────────────

export interface CreateAssignmentDto {
  patientFhirId: string;
  assignedUserId: string;
  assignedByUserId: string;
  assignmentRole: AssignmentRole;
}

// ── Repository Functions ─────────────────────────────────────────

/**
 * Insert a new assignment document.
 * Always creates a fresh document — never re-activates old ones (audit trail).
 */
export const createAssignment = (
  dto: CreateAssignmentDto,
): Promise<IAssignment> => {
  return Assignment.create({
    ...dto,
    active: true,
    assignedAt: new Date(),
    deactivatedAt: null,
  });
};

/**
 * Soft-delete an assignment.
 * Sets `active: false` and records `deactivatedAt` for the audit trail.
 * Returns the updated document or null if not found.
 */
export const deactivateAssignment = (
  assignmentId: string,
): Promise<IAssignment | null> => {
  return Assignment.findOneAndUpdate(
    { _id: assignmentId, active: true },
    { active: false, deactivatedAt: new Date() },
    { new: true },
  );
};

/**
 * Find a single assignment by its MongoDB _id.
 */
export const getAssignmentById = (
  assignmentId: string,
): Promise<IAssignment | null> => {
  return Assignment.findById(assignmentId);
};

/**
 * Find all assignments for a given patient.
 * Pass `activeOnly: true` to filter to active records only.
 */
export const getAssignmentsByPatient = (
  patientFhirId: string,
  activeOnly = true,
): Promise<IAssignment[]> => {
  return Assignment.find(
    activeOnly ? { patientFhirId, active: true } : { patientFhirId },
  ).sort({ assignedAt: -1 });
};

/**
 * Find all assignments for a given user (practitioner).
 * Pass `activeOnly: true` to filter to active records only.
 */
export const getAssignmentsByUser = (
  assignedUserId: string,
  activeOnly = true,
): Promise<IAssignment[]> => {
  return Assignment.find(
    activeOnly ? { assignedUserId, active: true } : { assignedUserId },
  ).sort({ assignedAt: -1 });
};

/**
 * Find all assignments across the system.
 * Pass `activeOnly: true` to filter to active records only.
 */
export const getAllAssignments = (
  activeOnly = true,
): Promise<IAssignment[]> => {
  return Assignment.find(activeOnly ? { active: true } : {}).sort({
    assignedAt: -1,
  });
};

/**
 * Check for an existing ACTIVE assignment for a specific user + patient combination.
 * Used by:
 *   - `isAssignedToPatient` middleware (access control)
 *   - `assignmentService.assignPatient` (duplicate guard)
 *
 * Optionally filters by assignment role(s).
 */
export const findActiveAssignment = (
  patientFhirId: string,
  assignedUserId: string,
  assignmentRoles?: AssignmentRole[],
): Promise<IAssignment | null> => {
  return Assignment.findOne({
    patientFhirId,
    assignedUserId,
    active: true,
    ...(assignmentRoles && assignmentRoles.length > 0
      ? { assignmentRole: { $in: assignmentRoles } }
      : {}),
  });
};
