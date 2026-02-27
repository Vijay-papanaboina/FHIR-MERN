import { apiDelete, apiGet, apiPost } from "@/lib/api";

export interface AssignmentDTO {
  _id: string;
  patientFhirId: string;
  assignedUserId: string;
  assignedByUserId: string;
  assignmentRole: "primary" | "covering" | "consulting";
  active: boolean;
  assignedAt: string;
  deactivatedAt?: string | null;
}

export interface CreateAssignmentInput {
  patientFhirId: string;
  assignedUserId: string;
  assignmentRole: "primary" | "covering" | "consulting";
}

export interface PractitionerSummaryDTO {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
}

export function fetchAssignmentsByPatient(
  patientFhirId: string,
): Promise<AssignmentDTO[]> {
  const trimmed = patientFhirId.trim();
  if (!trimmed) return Promise.reject(new Error("Patient ID is required"));
  return apiGet<AssignmentDTO[]>(
    `/api/assignments?patientFhirId=${encodeURIComponent(trimmed)}`,
  );
}

export function fetchAssignments(): Promise<AssignmentDTO[]> {
  return apiGet<AssignmentDTO[]>("/api/assignments");
}

export function fetchPractitioners(): Promise<PractitionerSummaryDTO[]> {
  return apiGet<PractitionerSummaryDTO[]>("/api/assignments/practitioners");
}

export function createAssignment(
  input: CreateAssignmentInput,
): Promise<AssignmentDTO> {
  return apiPost<AssignmentDTO>("/api/assignments", input);
}

export function deactivateAssignment(
  assignmentId: string,
): Promise<AssignmentDTO> {
  const trimmed = assignmentId.trim();
  if (!trimmed) return Promise.reject(new Error("Assignment ID is required"));
  return apiDelete<AssignmentDTO>(
    `/api/assignments/${encodeURIComponent(trimmed)}`,
  );
}
