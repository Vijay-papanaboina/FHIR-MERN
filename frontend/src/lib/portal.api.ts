import type { PatientDTO } from "@fhir-mern/shared";
import { apiGet } from "@/lib/api";
import { mapMedicationBundle, type MedicationDTO } from "@/lib/medication.api";

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

export async function fetchPortalMedications(): Promise<MedicationDTO[]> {
  const bundle = await apiGet<unknown>("/api/portal/medications");
  return mapMedicationBundle(bundle);
}
