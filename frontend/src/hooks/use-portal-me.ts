import { useQuery } from "@tanstack/react-query";
import { fetchPortalMe } from "@/lib/portal.api";

export const portalMeQueryKey = ["portal", "me"] as const;

export function usePortalMe(enabled = true) {
  return useQuery({
    queryKey: portalMeQueryKey,
    queryFn: fetchPortalMe,
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
