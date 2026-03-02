import { ClipboardList } from "lucide-react";
import { usePortalConditions } from "@/hooks/use-portal-conditions";
import { formatDate } from "@/lib/format";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CONDITION_STATUS_BADGE_VARIANT = {
  active: "default",
  inactive: "secondary",
  resolved: "outline",
  "entered-in-error": "destructive",
  unknown: "outline",
} as const;

export function PortalConditionsPage() {
  const { data, isPending, isError, error, refetch } =
    usePortalConditions(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Conditions</h1>
        <p className="text-muted-foreground">
          Diagnoses and clinical conditions in your record.
        </p>
      </div>

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load your conditions"}
          onRetry={refetch}
        />
      )}

      {!isPending && !isError && data && data.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No conditions"
          subtitle="No conditions are currently documented."
        />
      )}

      {!isPending && !isError && data && data.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded Date</TableHead>
                <TableHead>Documented By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((condition) => (
                <TableRow key={condition.id}>
                  <TableCell className="font-medium">
                    {condition.diagnosis}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        CONDITION_STATUS_BADGE_VARIANT[condition.status] ??
                        "outline"
                      }
                      className="capitalize"
                    >
                      {condition.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(condition.recordedDate)}</TableCell>
                  <TableCell>{condition.recorder ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
