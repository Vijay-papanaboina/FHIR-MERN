import { Pill } from "lucide-react";
import { toast } from "sonner";
import type {
  MedicationDTO,
  UpdatableMedicationStatus,
} from "@/lib/medication.api";
import { formatDate } from "@/lib/format";
import { PrescribeMedicationDialog } from "@/components/PrescribeMedicationDialog";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MEDICATION_STATUS_BADGE_VARIANT = {
  active: "default",
  completed: "secondary",
  stopped: "outline",
  "on-hold": "outline",
  cancelled: "outline",
  "entered-in-error": "destructive",
  draft: "outline",
  unknown: "outline",
} as const;

function getPrescriberLabel(
  prescriber: string | null,
  reference: string | null,
) {
  if (prescriber) return prescriber;
  if (!reference) return "—";
  const parts = reference.split("/");
  return parts[parts.length - 1] || reference;
}

interface PatientMedicationsTabProps {
  patientId: string;
  medications: MedicationDTO[] | undefined;
  medicationsLoading: boolean;
  medicationsError: boolean;
  onRetry: () => void;
  canWriteMedications: boolean;
  updatePending: boolean;
  onStatusUpdate: (
    medicationId: string,
    status: UpdatableMedicationStatus,
    options?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    },
  ) => void;
}

export function PatientMedicationsTab({
  patientId,
  medications,
  medicationsLoading,
  medicationsError,
  onRetry,
  canWriteMedications,
  updatePending,
  onStatusUpdate,
}: PatientMedicationsTabProps) {
  const activeMedications = (medications ?? []).filter(
    (medication) => medication.status === "active",
  );
  const nonActiveMedications = (medications ?? []).filter(
    (medication) => medication.status !== "active",
  );
  const showLoadingState = medicationsLoading && !medications;
  const showErrorState = !showLoadingState && medicationsError && !medications;
  const showEmptyState =
    !showLoadingState &&
    !showErrorState &&
    !!medications &&
    activeMedications.length === 0;
  const showActiveTable =
    !showLoadingState &&
    !showErrorState &&
    !!medications &&
    activeMedications.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Pill className="h-5 w-5" />
          Medications
        </h2>
        {canWriteMedications && (
          <span className="ml-auto">
            <PrescribeMedicationDialog patientId={patientId} />
          </span>
        )}
      </div>

      {showLoadingState && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Prescriber</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showErrorState && (
        <ErrorState message="Failed to load medications" onRetry={onRetry} />
      )}

      {showEmptyState && (
        <EmptyState
          icon={Pill}
          title="No active medications"
          subtitle="No active prescriptions found for this patient."
        />
      )}

      {showActiveTable && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Prescriber</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                {canWriteMedications && <TableHead>Update</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeMedications.map((medication) => (
                <TableRow key={medication.id}>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div>{medication.drugName}</div>
                      {medication.rxNormCode && (
                        <div className="text-xs text-muted-foreground">
                          RxNorm: {medication.rxNormCode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{medication.dosageInstructions ?? "—"}</TableCell>
                  <TableCell>{medication.frequency ?? "—"}</TableCell>
                  <TableCell>
                    {getPrescriberLabel(
                      medication.prescriber,
                      medication.prescriberReference,
                    )}
                  </TableCell>
                  <TableCell>{formatDate(medication.startDate)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        MEDICATION_STATUS_BADGE_VARIANT[medication.status] ??
                        "outline"
                      }
                      className="capitalize"
                    >
                      {medication.status}
                    </Badge>
                  </TableCell>
                  {canWriteMedications && (
                    <TableCell className="w-40">
                      <Select
                        disabled={updatePending}
                        onValueChange={(nextStatus: string) => {
                          if (
                            nextStatus !== "completed" &&
                            nextStatus !== "stopped"
                          ) {
                            return;
                          }
                          onStatusUpdate(medication.id, nextStatus, {
                            onSuccess: () => {
                              toast.success("Medication status updated");
                            },
                            onError: (error) => {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to update medication status",
                              );
                            },
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Set status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">
                            Mark completed
                          </SelectItem>
                          <SelectItem value="stopped">Mark stopped</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!showLoadingState &&
        !showErrorState &&
        medications &&
        nonActiveMedications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Medication History</CardTitle>
              <CardDescription>
                Completed, stopped, and other non-active prescriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {nonActiveMedications.map((medication) => (
                <div
                  key={medication.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{medication.drugName}</p>
                    <p className="text-muted-foreground">
                      {getPrescriberLabel(
                        medication.prescriber,
                        medication.prescriberReference,
                      )}{" "}
                      · {formatDate(medication.startDate)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      MEDICATION_STATUS_BADGE_VARIANT[medication.status] ??
                      "outline"
                    }
                    className="capitalize"
                  >
                    {medication.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
