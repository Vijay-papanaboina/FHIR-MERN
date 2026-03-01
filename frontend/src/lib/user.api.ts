import { apiGet, apiPatch } from "@/lib/api";
import type {
  ListUsersResponse,
  UserRole,
  UserRowDTO,
} from "@fhir-mern/shared";
export type {
  ListUsersResponse,
  UserRole,
  UserRowDTO,
} from "@fhir-mern/shared";

export function fetchUsers(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<ListUsersResponse> {
  const q = params?.q?.trim() ?? "";
  const page = Math.max(1, Math.trunc(params?.page ?? 1));
  const limit = Math.max(1, Math.min(100, Math.trunc(params?.limit ?? 25)));
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("page", String(page));
  query.set("limit", String(limit));
  return apiGet<ListUsersResponse>(`/api/users?${query.toString()}`);
}

export function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<UserRowDTO> {
  const trimmed = userId.trim();
  if (!trimmed) return Promise.reject(new Error("User ID is required"));
  return apiPatch<UserRowDTO>(
    `/api/users/${encodeURIComponent(trimmed)}/role`,
    {
      role,
    },
  );
}

export function linkUserPatient(
  userId: string,
  fhirPatientId: string,
): Promise<UserRowDTO> {
  const trimmedUserId = userId.trim();
  const trimmedPatientId = fhirPatientId.trim();
  if (!trimmedUserId) return Promise.reject(new Error("User ID is required"));
  if (!trimmedPatientId)
    return Promise.reject(new Error("FHIR Patient ID is required"));
  return apiPatch<UserRowDTO>(
    `/api/users/${encodeURIComponent(trimmedUserId)}/link-patient`,
    {
      fhirPatientId: trimmedPatientId,
    },
  );
}
