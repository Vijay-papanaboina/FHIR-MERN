import type { VitalsDTO, CreateVitalInput } from "@fhir-mern/shared";
import { apiGet, apiPost } from "@/lib/api";

export function fetchVitals(patientId: string): Promise<VitalsDTO[]> {
  const trimmed = patientId.trim();
  if (!trimmed) return Promise.reject(new Error("Patient ID is required"));
  return apiGet<VitalsDTO[]>(
    `/api/patients/${encodeURIComponent(trimmed)}/vitals`,
  );
}

export function createVital(
  patientId: string,
  input: CreateVitalInput,
): Promise<VitalsDTO> {
  const trimmed = patientId.trim();
  if (!trimmed) return Promise.reject(new Error("Patient ID is required"));
  return apiPost<VitalsDTO>(
    `/api/patients/${encodeURIComponent(trimmed)}/vitals`,
    input,
  );
}

export function fetchPortalVitals(): Promise<VitalsDTO[]> {
  return apiGet<VitalsDTO[]>("/api/portal/vitals");
}

export function createPortalVital(input: CreateVitalInput): Promise<VitalsDTO> {
  return apiPost<VitalsDTO>("/api/portal/vitals", input);
}
