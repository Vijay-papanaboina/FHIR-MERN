import { useQuery } from "@tanstack/react-query"
import { fetchPatient } from "@/lib/patient.api"

export function usePatient(id: string) {
    return useQuery({
        queryKey: ["patient", id],
        queryFn: () => fetchPatient(id),
        enabled: id.trim().length >= 1,
    })
}
