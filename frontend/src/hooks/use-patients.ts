import { useQuery } from "@tanstack/react-query";
import { fetchAssignedPatients, fetchPatients } from "@/lib/patient.api";

export function usePatients(name: string, enabled = true) {
  return useQuery({
    queryKey: ["patients", name],
    queryFn: () => fetchPatients(name),
    enabled: enabled && name.length >= 1,
    staleTime: 0, // always fresh — user is actively searching
  });
}

export function useAssignedPatients(enabled = true) {
  return useQuery({
    queryKey: ["patients", "assignedList"],
    queryFn: fetchAssignedPatients,
    enabled,
    staleTime: 30_000,
  });
}
