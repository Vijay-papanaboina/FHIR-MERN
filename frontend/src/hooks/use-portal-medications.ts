import { useQuery } from "@tanstack/react-query";
import { fetchPortalMedications } from "@/lib/portal.api";

export const portalMedicationsQueryKey = ["portal", "medications"] as const;

export function usePortalMedications(enabled = true) {
  return useQuery({
    queryKey: portalMedicationsQueryKey,
    queryFn: fetchPortalMedications,
    enabled,
    staleTime: 60_000,
  });
}
