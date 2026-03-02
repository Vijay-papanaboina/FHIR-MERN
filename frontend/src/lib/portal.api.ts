import type { PatientDTO, PortalCareTeamMemberDTO } from "@fhir-mern/shared";
import { apiGet } from "@/lib/api";
import { mapMedicationBundle, type MedicationDTO } from "@/lib/medication.api";
import { mapConditionBundle, type ConditionDTO } from "@/lib/condition.api";
import { mapAllergyBundle, type AllergyDTO } from "@/lib/allergy.api";
import {
  mapDiagnosticReportBundle,
  mapDiagnosticResultBundle,
  type DiagnosticReportDTO,
  type DiagnosticResultDTO,
} from "@/lib/diagnostic.api";

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

export async function fetchPortalConditions(): Promise<ConditionDTO[]> {
  const bundle = await apiGet<unknown>("/api/portal/conditions");
  return mapConditionBundle(bundle);
}

export async function fetchPortalAllergies(): Promise<AllergyDTO[]> {
  const bundle = await apiGet<unknown>("/api/portal/allergies");
  return mapAllergyBundle(bundle);
}

export async function fetchPortalDiagnostics(): Promise<DiagnosticReportDTO[]> {
  const bundle = await apiGet<unknown>("/api/portal/diagnostics");
  return mapDiagnosticReportBundle(bundle);
}

export async function fetchPortalDiagnosticResults(
  reportId: string,
): Promise<DiagnosticResultDTO[]> {
  const trimmedReportId = reportId.trim();
  if (!trimmedReportId) {
    return Promise.reject(new Error("Diagnostic report ID is required"));
  }
  const bundle = await apiGet<unknown>(
    `/api/portal/diagnostics/${encodeURIComponent(trimmedReportId)}/results`,
  );
  return mapDiagnosticResultBundle(bundle);
}
