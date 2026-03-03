import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPatientCondition,
  deletePatientCondition,
  fetchPatientConditions,
  updatePatientConditionStatus,
  type CreateConditionInput,
  type UpdatableConditionStatus,
} from "@/lib/condition.api";

export function useConditions(patientFhirId: string) {
  return useQuery({
    queryKey: ["conditions", patientFhirId],
    queryFn: () => fetchPatientConditions(patientFhirId),
    enabled: patientFhirId.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useCreateCondition(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConditionInput) =>
      createPatientCondition(patientFhirId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["conditions", patientFhirId],
      });
    },
  });
}

export function useUpdateConditionStatus(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conditionId,
      status,
    }: {
      conditionId: string;
      status: UpdatableConditionStatus;
    }) => updatePatientConditionStatus(patientFhirId, conditionId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["conditions", patientFhirId],
      });
    },
  });
}

export function useDeleteCondition(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conditionId: string) =>
      deletePatientCondition(patientFhirId, conditionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["conditions", patientFhirId],
      });
    },
  });
}
