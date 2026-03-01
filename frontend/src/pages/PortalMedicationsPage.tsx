import { Pill } from "lucide-react";
import { useMemo } from "react";
import { usePortalMedications } from "@/hooks/use-portal-medications";
import { formatDate } from "@/lib/format";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getDoctorName(prescriber: string | null, reference: string | null) {
  if (prescriber) return prescriber;
  if (!reference) return "—";
  const parts = reference.split("/");
  return parts[parts.length - 1] || reference;
}

export function PortalMedicationsPage() {
  const { data, isPending, isError, error, refetch } =
    usePortalMedications(true);

  const activeMedications = useMemo(
    () => (data ?? []).filter((medication) => medication.status === "active"),
    [data],
  );
  const medicationHistory = useMemo(
    () =>
      (data ?? []).filter(
        (medication) =>
          medication.status === "completed" || medication.status === "stopped",
      ),
    [data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Medications</h1>
        <p className="text-muted-foreground">
          Active prescriptions and medication history.
        </p>
      </div>

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Prescribing Doctor</TableHead>
                <TableHead>Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
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
          message={error?.message ?? "Failed to load your medications"}
          onRetry={refetch}
        />
      )}

      {data && activeMedications.length === 0 && (
        <EmptyState
          icon={Pill}
          title="No active medications"
          subtitle="You currently have no active prescriptions."
        />
      )}

      {data && activeMedications.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Prescribing Doctor</TableHead>
                <TableHead>Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeMedications.map((medication) => (
                <TableRow key={medication.id}>
                  <TableCell className="font-medium">
                    {medication.drugName}
                  </TableCell>
                  <TableCell>{medication.dosageInstructions ?? "—"}</TableCell>
                  <TableCell>
                    {getDoctorName(
                      medication.prescriber,
                      medication.prescriberReference,
                    )}
                  </TableCell>
                  <TableCell>{formatDate(medication.startDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Medication History</CardTitle>
          <CardDescription>
            Stopped and completed medications from your past prescriptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data && medicationHistory.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No stopped or completed medications yet.
            </p>
          )}
          {medicationHistory.map((medication) => (
            <div
              key={medication.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="space-y-1">
                <p className="font-medium">{medication.drugName}</p>
                <p className="text-sm text-muted-foreground">
                  {medication.dosageInstructions ?? "No dosage notes"} ·{" "}
                  {getDoctorName(
                    medication.prescriber,
                    medication.prescriberReference,
                  )}{" "}
                  · {formatDate(medication.startDate)}
                </p>
              </div>
              <Badge
                variant={
                  medication.status === "completed" ? "secondary" : "outline"
                }
                className="capitalize"
              >
                {medication.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
