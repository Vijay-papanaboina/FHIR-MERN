import { useQuery } from "@tanstack/react-query";
import {
  fetchPatientDiagnosticResults,
  fetchPatientDiagnostics,
} from "@/lib/diagnostic.api";

export function useDiagnostics(patientFhirId: string) {
  const normalizedId = patientFhirId.trim();
  return useQuery({
    queryKey: ["diagnostics", normalizedId],
    queryFn: () => fetchPatientDiagnostics(normalizedId),
    enabled: normalizedId.length > 0,
    staleTime: 30_000,
  });
}

export function useDiagnosticResults(
  patientFhirId: string,
  reportId: string,
  enabled = true,
) {
  const normalizedPatientId = patientFhirId.trim();
  const normalizedReportId = reportId.trim();
  return useQuery({
    queryKey: ["diagnostic-results", normalizedPatientId, normalizedReportId],
    queryFn: () =>
      fetchPatientDiagnosticResults(normalizedPatientId, normalizedReportId),
    enabled:
      enabled &&
      normalizedPatientId.length > 0 &&
      normalizedReportId.length > 0,
    staleTime: 30_000,
  });
}
