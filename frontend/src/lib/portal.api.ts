import type { PatientDTO, PortalCareTeamMemberDTO } from "@fhir-mern/shared";
import { apiGet } from "@/lib/api";
import { mapMedicationBundle, type MedicationDTO } from "@/lib/medication.api";

export function fetchPortalMe(): Promise<PatientDTO> {
  return apiGet<PatientDTO>("/api/portal/me");
}

export function fetchPortalCareTeam(): Promise<PortalCareTeamMemberDTO[]> {
  return apiGet<PortalCareTeamMemberDTO[]>("/api/portal/care-team");
}

export async function fetchPortalMedications(): Promise<MedicationDTO[]> {
  const bundle = await apiGet<unknown>("/api/portal/medications");
  return mapMedicationBundle(bundle);
}
