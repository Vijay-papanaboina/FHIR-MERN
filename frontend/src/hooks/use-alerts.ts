import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAlert,
  fetchAlerts,
  fetchAlertSummary,
  type AlertItem,
  type AlertListResponse,
  type AlertSummaryResponse,
} from "@/lib/alert.api";
import { useAlertsStore } from "@/store/alerts.store";

export function useAlerts(
  page = 1,
  limit = 50,
  enabled = true,
  options?: { unacknowledged?: boolean },
) {
  const unacknowledged = Boolean(options?.unacknowledged);
  return useQuery({
    queryKey: ["alerts", page, limit, unacknowledged ? "unack" : "all"],
    queryFn: () => fetchAlerts(page, limit, { unacknowledged }),
    enabled,
    staleTime: 15_000,
  });
}

export function useAlertsSummary(hours = 24, enabled = true) {
  return useQuery({
    queryKey: ["alerts-summary", hours],
    queryFn: () => fetchAlertSummary(hours),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAcknowledgeAlert(currentUserId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId),
    onSuccess: (updatedAlert) => {
      useAlertsStore.getState().mergeAlerts([updatedAlert]);
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
                          new Set([
                            ...updatedAlert.acknowledgedBy,
                            currentUserId,
                          ]),
                        )
                      : updatedAlert.acknowledgedBy,
                  }
                : item,
            ),
          };
        },
      );
      queryClient.setQueriesData<AlertSummaryResponse>(
        { queryKey: ["alerts-summary"] },
        (existing) => {
          if (!existing) return existing;
          return {
            ...existing,
            unacknowledgedCount: Math.max(0, existing.unacknowledgedCount - 1),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
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
