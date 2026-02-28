import { Activity } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { usePortalVitals } from "@/hooks/use-vitals";
import { VitalsChart } from "@/components/VitalsChart";
import { RecordVitalDialog } from "@/components/RecordVitalDialog";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PortalVitalsPage() {
  const {
    data: vitals,
    isPending,
    isError,
    error,
    refetch,
  } = usePortalVitals(true);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Vitals</h1>
          <p className="text-muted-foreground">
            View your history and submit self-reported readings.
          </p>
        </div>
        <RecordVitalDialog mode="portal" buttonLabel="Submit Reading" />
      </div>

      {isPending && <Skeleton className="h-[300px] w-full rounded-xl" />}
      {vitals && vitals.length > 0 && <VitalsChart vitals={vitals} />}

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load portal vitals"}
          onRetry={refetch}
        />
      )}

      {vitals && vitals.length === 0 && (
        <EmptyState
          icon={Activity}
          title="No vitals yet"
          subtitle="Submit your first reading to start your history."
        />
      )}

      {vitals && vitals.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vitals.map((vital) => (
                <TableRow key={vital.id}>
                  <TableCell className="font-medium">{vital.type}</TableCell>
                  <TableCell>
                    {vital.value != null
                      ? `${vital.value} ${vital.unit ?? ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>{formatDateTime(vital.recordedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
