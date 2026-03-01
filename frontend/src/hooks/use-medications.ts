import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPatientMedication,
  fetchPatientMedicationById,
  fetchPatientMedications,
  updatePatientMedicationStatus,
  type CreateMedicationInput,
  type UpdatableMedicationStatus,
} from "@/lib/medication.api";

export function useMedications(patientFhirId: string) {
  return useQuery({
    queryKey: ["medications", patientFhirId],
    queryFn: () => fetchPatientMedications(patientFhirId),
    enabled: patientFhirId.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useMedicationById(patientFhirId: string, medicationId: string) {
  return useQuery({
    queryKey: ["medications", patientFhirId, medicationId],
    queryFn: () => fetchPatientMedicationById(patientFhirId, medicationId),
    enabled: patientFhirId.trim().length > 0 && medicationId.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useCreateMedication(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMedicationInput) =>
      createPatientMedication(patientFhirId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["medications", patientFhirId],
      });
    },
  });
}

export function useUpdateMedicationStatus(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      medicationId,
      status,
    }: {
      medicationId: string;
      status: UpdatableMedicationStatus;
    }) => updatePatientMedicationStatus(patientFhirId, medicationId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["medications", patientFhirId],
      });
    },
  });
}
