import { useQuery } from "@tanstack/react-query";
import { fetchPortalConditions } from "@/lib/portal.api";

export const portalConditionsQueryKey = ["portal", "conditions"] as const;

export function usePortalConditions(enabled = true) {
  return useQuery({
    queryKey: portalConditionsQueryKey,
    queryFn: fetchPortalConditions,
    enabled,
    staleTime: 60_000,
  });
}
