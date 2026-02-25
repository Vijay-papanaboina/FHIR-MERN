import { useQuery } from "@tanstack/react-query"
import { fetchVitals } from "@/lib/vitals.api"

export function useVitals(patientId: string) {
    return useQuery({
        queryKey: ["vitals", patientId],
        queryFn: () => fetchVitals(patientId),
        enabled: patientId.trim().length >= 1,
        staleTime: 1000 * 30, // 30s — may change when new vitals recorded
    })
}
