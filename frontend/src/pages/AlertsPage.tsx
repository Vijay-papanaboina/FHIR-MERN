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
} from "@/hooks/use-alerts";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAlertsStore } from "@/store/alerts.store";

const PAGE_LIMIT = 50;
type AlertViewFilter = "unacknowledged" | "acknowledged" | "all";

export function AlertsPage() {
  const [viewFilter, setViewFilter] = useState<AlertViewFilter>("all");
  const { session } = useResolvedRole();
  const currentUserId = useMemo(() => {
    const raw = getSessionUserValue(session, "id");
    return typeof raw === "string" ? raw : null;
  }, [session]);

  const { data, isPending, isError, error, refetch } = useAlerts(1, PAGE_LIMIT);
  const acknowledgeMutation = useAcknowledgeAlert(currentUserId);
  const alertsFromStore = useAlertsStore((state) => state.alerts);
  const setAlerts = useAlertsStore((state) => state.setAlerts);

  useEffect(() => {
    if (data?.items) {
      setAlerts(data.items);
    }
  }, [data?.items, setAlerts]);

  const patientIds = useMemo(
    () =>
      Array.from(
        new Set(
          (alertsFromStore.length > 0 ? alertsFromStore : (data?.items ?? []))
            .map((item) => item.patientFhirId)
            .filter(Boolean),
        ),
      ),
    [alertsFromStore, data?.items],
  );

  const patientQueries = useQueries({
    queries: patientIds.map((patientId) => ({
      queryKey: ["patient", patientId],
      queryFn: () => fetchPatient(patientId),
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

  const items = useMemo(
    () => (alertsFromStore.length > 0 ? alertsFromStore : (data?.items ?? [])),
    [alertsFromStore, data?.items],
  );
  const unacknowledgedCount = useMemo(
    () =>
      items.filter((alert) => !isAcknowledgedByUser(alert, currentUserId))
        .length,
    [items, currentUserId],
  );
  const acknowledgedCount = useMemo(
    () =>
      items.filter((alert) => isAcknowledgedByUser(alert, currentUserId))
        .length,
    [items, currentUserId],
  );
  const filteredItems = useMemo(() => {
    if (viewFilter === "unacknowledged") {
      return items.filter(
        (alert) => !isAcknowledgedByUser(alert, currentUserId),
      );
    }
    if (viewFilter === "acknowledged") {
      return items.filter((alert) =>
        isAcknowledgedByUser(alert, currentUserId),
      );
    }
    return items;
  }, [items, currentUserId, viewFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground">
          Alert history for your current role scope
        </p>
      </div>

      {!isPending && !isError && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewFilter === "unacknowledged" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewFilter("unacknowledged")}
          >
            Unacknowledged ({unacknowledgedCount})
          </Button>
          <Button
            variant={viewFilter === "acknowledged" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewFilter("acknowledged")}
          >
            Acknowledged ({acknowledgedCount})
          </Button>
          <Button
            variant={viewFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewFilter("all")}
          >
            All ({items.length})
          </Button>
        </div>
      )}

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Vital</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Acknowledged</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load alerts"}
          onRetry={refetch}
        />
      )}

      {!isPending && !isError && filteredItems.length === 0 && (
        <EmptyState
          icon={Bell}
          title={
            viewFilter === "all"
              ? "No alerts yet"
              : viewFilter === "unacknowledged"
                ? "No unacknowledged alerts"
                : "No acknowledged alerts"
          }
          subtitle="Alert history will appear here when threshold breaches occur"
        />
      )}

      {!isPending && !isError && filteredItems.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Vital</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Acknowledged</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((alert) => {
                const acknowledged = isAcknowledgedByUser(alert, currentUserId);
                const recipientCount = alert.sentToUserIds?.length ?? 0;
                const acknowledgedCount = alert.acknowledgedBy?.length ?? 0;
                return (
                  <TableRow
                    key={alert._id}
                    className={acknowledged ? "opacity-55" : undefined}
                  >
                    <TableCell className="font-medium">
                      {patientNameById.get(alert.patientFhirId) ??
                        alert.patientFhirId}
                    </TableCell>
                    <TableCell>{alert.type}</TableCell>
                    <TableCell>
                      {alert.value} {alert.unit}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {recipientCount > 0
                        ? `${acknowledgedCount}/${recipientCount}`
                        : `${acknowledgedCount}`}
                    </TableCell>
                    <TableCell>
                      {formatDateTime(alert.recordDate || alert.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={acknowledged ? "secondary" : "outline"}
                        disabled={acknowledged || acknowledgeMutation.isPending}
                        onClick={() => acknowledgeMutation.mutate(alert._id)}
                      >
                        {acknowledged ? "Acknowledged" : "Acknowledge"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
