import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Bell, AlertTriangle } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { fetchPatient } from "@/lib/patient.api";
import { getSessionUserValue } from "@/lib/roles";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import {
  isAcknowledgedByUser,
  useAcknowledgeAlert,
  useAlerts,
  useAlertsSummary,
} from "@/hooks/use-alerts";
import { useAlertsStore } from "@/store/alerts.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const PANEL_PAGE_LIMIT = 50;

export function AlertPanel() {
  const [open, setOpen] = useState(false);
  const [pendingAckIds, setPendingAckIds] = useState<Set<string>>(new Set());
  const { session } = useResolvedRole();
  const currentUserId = useMemo(() => {
    const raw = getSessionUserValue(session, "id");
    return typeof raw === "string" ? raw : null;
  }, [session]);

  const unreadCount = useAlertsStore((state) => state.unreadCount);
  const alerts = useAlertsStore((state) => state.alerts);
  const setUnreadCount = useAlertsStore((state) => state.setUnreadCount);
  const mergeAlerts = useAlertsStore((state) => state.mergeAlerts);
  const setPanelOpen = useAlertsStore((state) => state.setPanelOpen);

  const { data: summary } = useAlertsSummary(24, true);
  const { data, isFetching } = useAlerts(1, PANEL_PAGE_LIMIT, open, {
    unacknowledged: true,
  });
  const acknowledgeMutation = useAcknowledgeAlert(currentUserId);

  useEffect(() => {
    setPanelOpen(open);
    return () => setPanelOpen(false);
  }, [open, setPanelOpen]);

  useEffect(() => {
    if (typeof summary?.unacknowledgedCount === "number") {
      setUnreadCount(summary.unacknowledgedCount);
    }
  }, [setUnreadCount, summary?.unacknowledgedCount]);

  useEffect(() => {
    if (open && data?.items?.length) {
      mergeAlerts(data.items);
    }
  }, [data?.items, mergeAlerts, open]);

  const patientIds = useMemo(
    () =>
      Array.from(
        new Set(
          alerts
            .filter((item) => !isAcknowledgedByUser(item, currentUserId))
            .map((item) => item.patientFhirId)
            .filter(Boolean),
        ),
      ),
    [alerts, currentUserId],
  );

  const panelAlerts = useMemo(
    () => alerts.filter((item) => !isAcknowledgedByUser(item, currentUserId)),
    [alerts, currentUserId],
  );

  const patientQueries = useQueries({
    queries: patientIds.map((patientId) => ({
      queryKey: ["patient", patientId],
      queryFn: () => fetchPatient(patientId),
      enabled: open && patientIds.length > 0,
      staleTime: 5 * 60_000,
      retry: 1,
    })),
  });

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    patientIds.forEach((id, index) => {
      const patient = patientQueries[index]?.data;
      map.set(id, patient?.displayName ?? id);
    });
    return map;
  }, [patientIds, patientQueries]);

  const acknowledgeSingleAlert = async (alertId: string) => {
    setPendingAckIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });

    try {
      await acknowledgeMutation.mutateAsync(alertId);
    } finally {
      setPendingAckIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Alerts"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Alerts</SheetTitle>
          <SheetDescription>Unacknowledged alerts.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isFetching && panelAlerts.length === 0 && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-md border p-3">
                  <Skeleton className="mb-2 h-4 w-40" />
                  <Skeleton className="mb-2 h-4 w-28" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          )}

          {!isFetching && panelAlerts.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No alerts yet.
            </p>
          )}

          {panelAlerts.length > 0 && (
            <div className="space-y-2">
              {panelAlerts.map((alert) => {
                const acknowledged = isAcknowledgedByUser(alert, currentUserId);
                const acknowledgedByOthers = alert.acknowledgedBy.filter(
                  (id) => id !== currentUserId,
                ).length;
                return (
                  <div
                    key={alert._id}
                    className={`rounded-md border p-3 transition-opacity ${
                      acknowledged ? "opacity-55" : ""
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {patientNameById.get(alert.patientFhirId) ??
                        alert.patientFhirId}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {alert.type} · {alert.value} {alert.unit}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "destructive"
                            : "outline"
                        }
                        className={
                          alert.severity === "warning"
                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                            : ""
                        }
                      >
                        {alert.severity === "critical" ? (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            Critical
                          </>
                        ) : (
                          "Warning"
                        )}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(alert.recordDate || alert.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant={acknowledged ? "secondary" : "outline"}
                        disabled={acknowledged || pendingAckIds.has(alert._id)}
                        onClick={() => {
                          void acknowledgeSingleAlert(alert._id);
                        }}
                      >
                        {acknowledged ? "Acknowledged" : "Acknowledge"}
                      </Button>
                      {!acknowledged && acknowledgedByOthers > 0 && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Acknowledged by {acknowledgedByOthers}{" "}
                          {acknowledgedByOthers === 1 ? "other" : "others"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
