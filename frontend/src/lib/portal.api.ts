import type { PatientDTO } from "@fhir-mern/shared";
import { apiGet } from "@/lib/api";

export interface PortalCareTeamMember {
  name: string;
  image?: string;
  assignmentRole: "primary" | "covering" | "consulting";
}

export function fetchPortalMe(): Promise<PatientDTO> {
  return apiGet<PatientDTO>("/api/portal/me");
}

export function fetchPortalCareTeam(): Promise<PortalCareTeamMember[]> {
  return apiGet<PortalCareTeamMember[]>("/api/portal/care-team");
}
