import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  linkUserPractitioner,
  linkUserPatient,
  updateUserRole,
  type UserRole,
} from "@/lib/user.api";

interface UseUsersOptions {
  q?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useUsers(options: UseUsersOptions = {}) {
  const q = options.q ?? "";
  const page = options.page ?? 1;
  const limit = options.limit ?? 25;
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: ["users", q, page, limit],
    queryFn: () => fetchUsers({ q, page, limit }),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useLinkUserPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      fhirPatientId,
    }: {
      userId: string;
      fhirPatientId: string;
    }) => linkUserPatient(userId, fhirPatientId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useLinkUserPractitioner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      fhirPractitionerId,
    }: {
      userId: string;
      fhirPractitionerId: string;
    }) => linkUserPractitioner(userId, fhirPractitionerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
