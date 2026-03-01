export type AssignmentRole = "primary" | "covering" | "consulting";

export interface AssignmentDTO {
  _id: string;
  patientFhirId: string;
  assignedUserId: string;
  assignedByUserId: string;
  assignmentRole: AssignmentRole;
  active: boolean;
  assignedAt: string;
  deactivatedAt?: string | null;
}

export interface CreateAssignmentInput {
  patientFhirId: string;
  assignedUserId: string;
  assignmentRole: AssignmentRole;
}

export interface PractitionerSummaryDTO {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
}
