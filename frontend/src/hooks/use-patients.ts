import { useQuery } from "@tanstack/react-query"
import { fetchPatients } from "@/lib/patient.api"

export function usePatients(name: string) {
    return useQuery({
        queryKey: ["patients", name],
        queryFn: () => fetchPatients(name),
        enabled: name.length >= 1,
    })
}
