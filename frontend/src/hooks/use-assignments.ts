import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAssignment,
  deactivateAssignment,
  fetchAssignments,
  fetchAssignmentsByPatient,
  fetchPractitioners,
  type CreateAssignmentInput,
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

export function useAssignments(enabled = true) {
  return useQuery({
    queryKey: ["assignments", "all"],
    queryFn: fetchAssignments,
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => createAssignment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

export function useDeactivateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => deactivateAssignment(assignmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}
