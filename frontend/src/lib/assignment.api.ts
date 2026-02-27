import { apiGet } from "@/lib/api";

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

export function fetchPractitioners(): Promise<PractitionerSummaryDTO[]> {
  return apiGet<PractitionerSummaryDTO[]>("/api/assignments/practitioners");
}
