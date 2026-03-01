import { useQuery } from "@tanstack/react-query";
import { fetchPatient, fetchPatientAssignmentRole } from "@/lib/patient.api";

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatient(id),
    enabled: id.trim().length >= 1,
    staleTime: 1000 * 60 * 5, // 5 min — demographics rarely change
    gcTime: 1000 * 60 * 10, // 10 min — survive back-navigation
  });
}

export function usePatientAssignmentRole(id: string, enabled = true) {
  return useQuery({
    queryKey: ["patient-assignment-role", id],
    queryFn: () => fetchPatientAssignmentRole(id),
    enabled: enabled && id.trim().length >= 1,
    staleTime: 30_000,
  });
}
