import { useQuery } from "@tanstack/react-query";
import { fetchPortalDiagnostics } from "@/lib/portal.api";

export const portalDiagnosticsQueryKey = ["portal", "diagnostics"] as const;

export function usePortalDiagnostics(enabled = true) {
  return useQuery({
    queryKey: portalDiagnosticsQueryKey,
    queryFn: fetchPortalDiagnostics,
    enabled,
    staleTime: 60_000,
  });
}
