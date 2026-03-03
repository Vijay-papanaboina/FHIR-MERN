import { useQuery } from "@tanstack/react-query";
import { fetchPortalDiagnosticResults } from "@/lib/portal.api";

export function usePortalDiagnosticResults(reportId: string, enabled = true) {
  const normalizedReportId = reportId.trim();
  return useQuery({
    queryKey: ["portal", "diagnostic-results", normalizedReportId],
    queryFn: () => fetchPortalDiagnosticResults(normalizedReportId),
    enabled: enabled && normalizedReportId.length > 0,
    staleTime: 60_000,
  });
}
