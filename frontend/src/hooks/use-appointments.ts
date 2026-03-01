import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateAppointmentRequestInput,
  UpdateAppointmentDecisionInput,
} from "@fhir-mern/shared";
import {
  cancelPortalAppointment,
  createPatientAppointment,
  createPortalAppointment,
  decidePatientAppointment,
  fetchPatientAppointments,
  fetchPortalAppointments,
} from "@/lib/appointment.api";

export function usePatientAppointments(patientFhirId: string) {
  return useQuery({
    queryKey: ["appointments", "patient", patientFhirId],
    queryFn: () => fetchPatientAppointments(patientFhirId),
    enabled: patientFhirId.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useCreatePatientAppointment(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentRequestInput) =>
      createPatientAppointment(patientFhirId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["appointments", "patient", patientFhirId],
      });
    },
  });
}

export function useDecidePatientAppointment(patientFhirId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      input,
    }: {
      appointmentId: string;
      input: UpdateAppointmentDecisionInput;
    }) => decidePatientAppointment(patientFhirId, appointmentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["appointments", "patient", patientFhirId],
      });
    },
  });
}

export function usePortalAppointments(enabled = true) {
  return useQuery({
    queryKey: ["portal", "appointments"],
    queryFn: fetchPortalAppointments,
    enabled,
    staleTime: 30_000,
  });
}

export function useCreatePortalAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentRequestInput) =>
      createPortalAppointment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["portal", "appointments"],
      });
    },
  });
}

export function useCancelPortalAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      comment,
    }: {
      appointmentId: string;
      comment?: string;
    }) => cancelPortalAppointment(appointmentId, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["portal", "appointments"],
      });
    },
  });
}
