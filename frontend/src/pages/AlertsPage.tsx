import { useMemo } from "react";
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

const PAGE_LIMIT = 50;

export function AlertsPage() {
  const { session } = useResolvedRole();
  const currentUserId = useMemo(() => {
    const raw = getSessionUserValue(session, "id");
    return typeof raw === "string" ? raw : null;
  }, [session]);

  const { data, isPending, isError, error, refetch } = useAlerts(1, PAGE_LIMIT);
  const acknowledgeMutation = useAcknowledgeAlert(currentUserId);

  const patientIds = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.items ?? []).map((item) => item.patientFhirId).filter(Boolean),
        ),
      ),
    [data?.items],
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

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground">
          Alert history for your current role scope
        </p>
      </div>

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Vital</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Severity</TableHead>
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

      {!isPending && !isError && items.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No alerts yet"
          subtitle="Alert history will appear here when threshold breaches occur"
        />
      )}

      {!isPending && !isError && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Vital</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((alert) => {
                const acknowledged = isAcknowledgedByUser(alert, currentUserId);
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
