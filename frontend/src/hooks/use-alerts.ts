import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAlert,
  fetchAlerts,
  type AlertItem,
  type AlertListResponse,
} from "@/lib/alert.api";

export function useAlerts(page = 1, limit = 50) {
  return useQuery({
    queryKey: ["alerts", page, limit],
    queryFn: () => fetchAlerts(page, limit),
    staleTime: 15_000,
  });
}

export function useAcknowledgeAlert(currentUserId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId),
    onSuccess: (updatedAlert) => {
      queryClient.setQueriesData<AlertListResponse>(
        { queryKey: ["alerts"] },
        (existing) => {
          if (!existing) return existing;
          return {
            ...existing,
            items: existing.items.map((item) =>
              item._id === updatedAlert._id
                ? {
                    ...updatedAlert,
                    acknowledgedBy: currentUserId
                      ? Array.from(
                          new Set([...updatedAlert.acknowledgedBy, currentUserId]),
                        )
                      : updatedAlert.acknowledgedBy,
                  }
                : item,
            ),
          };
        },
      );
    },
  });
}

export function isAcknowledgedByUser(
  alert: AlertItem,
  userId: string | null,
): boolean {
  if (!userId) return false;
  return alert.acknowledgedBy.includes(userId);
}
