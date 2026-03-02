import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPatientAllergy,
  deletePatientAllergy,
  fetchPatientAllergies,
  updatePatientAllergyStatus,
  type CreateAllergyInput,
  type UpdatableAllergyStatus,
} from "@/lib/allergy.api";

export function useAllergies(patientFhirId: string) {
  return useQuery({
    queryKey: ["allergies", patientFhirId],
    queryFn: () => fetchPatientAllergies(patientFhirId),
    enabled: patientFhirId.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useCreateAllergy(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAllergyInput) =>
      createPatientAllergy(patientFhirId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["allergies", patientFhirId],
      });
    },
  });
}

export function useUpdateAllergyStatus(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      allergyId,
      status,
    }: {
      allergyId: string;
      status: UpdatableAllergyStatus;
    }) => updatePatientAllergyStatus(patientFhirId, allergyId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["allergies", patientFhirId],
      });
    },
  });
}

export function useDeleteAllergy(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allergyId: string) =>
      deletePatientAllergy(patientFhirId, allergyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["allergies", patientFhirId],
      });
    },
  });
}
