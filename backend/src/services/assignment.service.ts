import type { IAssignment } from "../models/assignment.model.js";
import { User } from "../models/auth.model.js";
import {
  createAssignment,
  deactivateAssignment,
  getAssignmentsByPatient,
  getAssignmentsByUser,
  getAssignmentById,
  findActiveAssignment,
} from "../repositories/assignment.repository.js";
import type { CreateAssignmentInput } from "../validators/assignment.validator.js";
import { AppError } from "../utils/AppError.js";

// ── Assignment Service ───────────────────────────────────────────

/**
 * Create a new patient assignment.
 *
 * Enforces:
 *   1. No self-assignment (admin cannot assign themselves)
 *   2. Target user must be a practitioner
 *   3. No duplicate active assignment for the same user + patient
 */
export const assignPatient = async (
  adminUserId: string,
  input: CreateAssignmentInput,
): Promise<IAssignment> => {
  // 1. No self-assignment
  if (input.assignedUserId === adminUserId) {
    throw new AppError("Cannot assign yourself to a patient.", 403);
  }

  // 2. Target must be a practitioner
  const targetUser = await User.findById(input.assignedUserId, { role: 1 });
  if (!targetUser) {
    throw new AppError("Target user not found.", 404);
  }
  if (targetUser.role !== "practitioner") {
    throw new AppError("Only practitioners can be assigned to patients.", 403);
  }

  // 3. No duplicate active assignment
  const existing = await findActiveAssignment(
    input.patientFhirId,
    input.assignedUserId,
  );
  if (existing) {
    throw new AppError(
      "An active assignment already exists for this user and patient.",
      409,
    );
  }

  return createAssignment({
    ...input,
    assignedByUserId: adminUserId,
  });
};

/**
 * Deactivate (soft-delete) an assignment.
 * Only deactivates if the assignment is currently active.
 * Returns the updated assignment document.
 */
export const removeAssignment = async (
  assignmentId: string,
): Promise<IAssignment> => {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found.", 404);
  }
  if (!assignment.active) {
    throw new AppError("Assignment is already deactivated.", 400);
  }

  const updated = await deactivateAssignment(assignmentId);
  // Should never be null at this point since we already verified it exists + active
  return updated!;
};

/**
 * Get all assignments for a given patient (active only by default).
 */
export const getPatientAssignments = (
  patientFhirId: string,
  activeOnly = true,
): Promise<IAssignment[]> => {
  return getAssignmentsByPatient(patientFhirId, activeOnly);
};

/**
 * Get all assignments for a given user/practitioner (active only by default).
 */
export const getUserAssignments = (
  userId: string,
  activeOnly = true,
): Promise<IAssignment[]> => {
  return getAssignmentsByUser(userId, activeOnly);
};

/**
 * Get all practitioners in the system.
 * Used by admin UI to populate the assignment form dropdown.
 */
export const getPractitioners = () => {
  return User.find(
    { role: "practitioner" },
    { _id: 1, name: 1, email: 1, image: 1 },
  ).lean();
};
