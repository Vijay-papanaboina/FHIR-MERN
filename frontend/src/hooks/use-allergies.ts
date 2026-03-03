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
  const normalizedId = patientFhirId.trim();
  return useQuery({
    queryKey: ["allergies", normalizedId],
    queryFn: () => fetchPatientAllergies(normalizedId),
    enabled: normalizedId.length > 0,
    staleTime: 30_000,
  });
}

export function useCreateAllergy(patientFhirId: string) {
  const normalizedId = patientFhirId.trim();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAllergyInput) =>
      createPatientAllergy(normalizedId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["allergies", normalizedId],
      });
    },
  });
}

export function useUpdateAllergyStatus(patientFhirId: string) {
  const normalizedId = patientFhirId.trim();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      allergyId,
      status,
    }: {
      allergyId: string;
      status: UpdatableAllergyStatus;
    }) => updatePatientAllergyStatus(normalizedId, allergyId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["allergies", normalizedId],
      });
    },
  });
}

export function useDeleteAllergy(patientFhirId: string) {
  const normalizedId = patientFhirId.trim();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allergyId: string) =>
      deletePatientAllergy(normalizedId, allergyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["allergies", normalizedId],
      });
    },
  });
}
