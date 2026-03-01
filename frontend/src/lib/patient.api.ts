import type {
  PatientAssignmentRoleResponse,
  PatientDTO,
} from "@fhir-mern/shared";
import { apiGet } from "@/lib/api";
export type {
  PatientAssignmentRole,
  PatientAssignmentRoleResponse,
} from "@fhir-mern/shared";

export function fetchPatients(name: string): Promise<PatientDTO[]> {
  const trimmed = name.trim();
  if (!trimmed) return Promise.reject(new Error("Patient name is required"));
  return apiGet<PatientDTO[]>(
    `/api/patients?name=${encodeURIComponent(trimmed)}`,
  );
}

export function fetchPatient(id: string): Promise<PatientDTO> {
  const trimmed = id.trim();
  if (!trimmed) return Promise.reject(new Error("Patient ID is required"));
  return apiGet<PatientDTO>(`/api/patients/${encodeURIComponent(trimmed)}`);
}

export function fetchAssignedPatients(): Promise<PatientDTO[]> {
  return apiGet<PatientDTO[]>("/api/patients/assigned");
}

export function fetchPatientAssignmentRole(
  id: string,
): Promise<PatientAssignmentRoleResponse> {
  const trimmed = id.trim();
  if (!trimmed) return Promise.reject(new Error("Patient ID is required"));
  return apiGet<PatientAssignmentRoleResponse>(
    `/api/patients/${encodeURIComponent(trimmed)}/assignment-role`,
  );
}
