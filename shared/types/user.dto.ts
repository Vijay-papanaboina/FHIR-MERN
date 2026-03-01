export type UserRole = "patient" | "practitioner" | "admin";

export interface UserRowDTO {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  fhirPatientId: string | null;
}

export interface ListUsersResponse {
  items: UserRowDTO[];
  total: number;
  page: number;
  limit: number;
}
