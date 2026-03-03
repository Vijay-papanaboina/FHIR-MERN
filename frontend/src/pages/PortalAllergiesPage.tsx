import { ShieldAlert } from "lucide-react";
import { usePortalAllergies } from "@/hooks/use-portal-allergies";
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

const ALLERGY_STATUS_BADGE_VARIANT = {
  active: "default",
  inactive: "secondary",
  resolved: "outline",
  "entered-in-error": "destructive",
  unknown: "outline",
} as const;

export function PortalAllergiesPage() {
  const { data, isPending, isError, error, refetch } = usePortalAllergies(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Allergies</h1>
        <p className="text-muted-foreground">
          Documented allergies and intolerances in your record.
        </p>
      </div>

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Substance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded Date</TableHead>
                <TableHead>Reaction</TableHead>
                <TableHead>Criticality</TableHead>
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
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load your allergies"}
          onRetry={refetch}
        />
      )}

      {!isPending && !isError && data && data.length === 0 && (
        <EmptyState
          icon={ShieldAlert}
          title="No allergies"
          subtitle="No allergies are currently documented."
        />
      )}

      {!isPending && !isError && data && data.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Substance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded Date</TableHead>
                <TableHead>Reaction</TableHead>
                <TableHead>Criticality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((allergy) => (
                <TableRow key={allergy.id}>
                  <TableCell className="font-medium">
                    {allergy.substance}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ALLERGY_STATUS_BADGE_VARIANT[allergy.status] ??
                        "outline"
                      }
                      className="capitalize"
                    >
                      {allergy.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(allergy.recordedDate)}</TableCell>
                  <TableCell>{allergy.reaction ?? "—"}</TableCell>
                  <TableCell className="capitalize">
                    {allergy.criticality ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
