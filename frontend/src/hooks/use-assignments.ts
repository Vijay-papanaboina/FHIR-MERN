import { useQuery } from "@tanstack/react-query";
import {
  fetchAssignmentsByPatient,
  fetchPractitioners,
} from "@/lib/assignment.api";

export function usePatientAssignments(patientFhirId: string, enabled = true) {
  return useQuery({
    queryKey: ["assignments", "patient", patientFhirId],
    queryFn: () => fetchAssignmentsByPatient(patientFhirId),
    enabled: enabled && patientFhirId.trim().length > 0,
    staleTime: 30_000,
  });
}

export function usePractitioners(enabled = true) {
  return useQuery({
    queryKey: ["assignments", "practitioners"],
    queryFn: fetchPractitioners,
    enabled,
    staleTime: 5 * 60_000,
  });
}
