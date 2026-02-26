import { z } from "zod";

/**
 * Zod schema for creating a new assignment.
 * Used in the assignment controller to validate incoming requests.
 */
export const createAssignmentSchema = z.object({
  patientFhirId: z.string().min(1, "patientFhirId is required"),
  assignedUserId: z.string().min(1, "assignedUserId is required"),
  assignmentRole: z.enum(["primary", "covering", "consulting"], {
    message: "assignmentRole must be one of: primary, covering, consulting",
  }),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
