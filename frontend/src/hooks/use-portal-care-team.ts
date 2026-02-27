import { useQuery } from "@tanstack/react-query";
import { fetchPortalCareTeam } from "@/lib/portal.api";

export const portalCareTeamQueryKey = ["portal", "care-team"] as const;

export function usePortalCareTeam(enabled = true) {
  return useQuery({
    queryKey: portalCareTeamQueryKey,
    queryFn: fetchPortalCareTeam,
    enabled,
    staleTime: 60_000,
  });
}
