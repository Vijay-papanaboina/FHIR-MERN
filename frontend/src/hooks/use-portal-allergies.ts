import { useQuery } from "@tanstack/react-query";
import { fetchPortalAllergies } from "@/lib/portal.api";

export const portalAllergiesQueryKey = ["portal", "allergies"] as const;

export function usePortalAllergies(enabled = true) {
  return useQuery({
    queryKey: portalAllergiesQueryKey,
    queryFn: fetchPortalAllergies,
    enabled,
    staleTime: 60_000,
  });
}
