import { useQuery } from "@tanstack/react-query"
import { fetchPatient } from "@/lib/patient.api"

export function usePatient(id: string) {
    return useQuery({
        queryKey: ["patient", id],
        queryFn: () => fetchPatient(id),
        enabled: id.trim().length >= 1,
        staleTime: 1000 * 60 * 5, // 5 min — demographics rarely change
        gcTime: 1000 * 60 * 10,   // 10 min — survive back-navigation
    })
}
