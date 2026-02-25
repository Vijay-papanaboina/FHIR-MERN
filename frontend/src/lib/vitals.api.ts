import type { VitalsDTO } from "@fhir-mern/shared"
import { apiGet } from "@/lib/api"

export function fetchVitals(patientId: string): Promise<VitalsDTO[]> {
    const trimmed = patientId.trim()
    if (!trimmed) return Promise.reject(new Error("Patient ID is required"))
    return apiGet<VitalsDTO[]>(`/api/patients/${encodeURIComponent(trimmed)}/vitals`)
}
