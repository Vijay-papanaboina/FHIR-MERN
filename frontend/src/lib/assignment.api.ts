import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type {
  AssignmentDTO,
  CreateAssignmentInput,
  PractitionerSummaryDTO,
} from "@fhir-mern/shared";
export type {
  AssignmentDTO,
  CreateAssignmentInput,
  PractitionerSummaryDTO,
} from "@fhir-mern/shared";

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
