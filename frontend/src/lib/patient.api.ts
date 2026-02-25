import type { PatientDTO } from "@fhir-mern/shared"
import { apiGet } from "@/lib/api"

export function fetchPatients(name: string): Promise<PatientDTO[]> {
    const trimmed = name.trim()
    if (!trimmed) return Promise.reject(new Error("Patient name is required"))
    return apiGet<PatientDTO[]>(`/api/patients?name=${encodeURIComponent(trimmed)}`)
}

export function fetchPatient(id: string): Promise<PatientDTO> {
    const trimmed = id.trim()
    if (!trimmed) return Promise.reject(new Error("Patient ID is required"))
    return apiGet<PatientDTO>(`/api/patients/${encodeURIComponent(trimmed)}`)
}
