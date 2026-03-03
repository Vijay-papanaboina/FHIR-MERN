import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import type { ConditionDTO, UpdatableConditionStatus } from "@fhir-mern/shared";
import { formatDate } from "@/lib/format";
import { AddConditionDialog } from "@/components/AddConditionDialog";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const CONDITION_STATUS_BADGE_VARIANT = {
  active: "default",
  inactive: "secondary",
  resolved: "outline",
  "entered-in-error": "destructive",
  unknown: "outline",
} as const;

interface PatientConditionsTabProps {
  conditions: ConditionDTO[] | undefined;
  conditionsLoading: boolean;
  conditionsError: boolean;
  onRetry: () => void;
  canWriteConditions: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  onCreate: (input: {
    diagnosis: string;
    snomedCode?: string;
    recordedDate: string;
    note?: string;
  }) => Promise<void>;
  onStatusUpdate: (
    conditionId: string,
    status: UpdatableConditionStatus,
    options?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    },
  ) => void;
  onDelete: (
    conditionId: string,
    options?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    },
  ) => void;
}

export function PatientConditionsTab({
  conditions,
  conditionsLoading,
  conditionsError,
  onRetry,
  canWriteConditions,
  creating,
  updating,
  deleting,
  onCreate,
  onStatusUpdate,
  onDelete,
}: PatientConditionsTabProps) {
  const showLoadingState = conditionsLoading && !conditions;
  const showErrorState = !showLoadingState && conditionsError && !conditions;
  const showEmptyState =
    !showLoadingState &&
    !showErrorState &&
    !!conditions &&
    conditions.length === 0;
  const showTable =
    !showLoadingState &&
    !showErrorState &&
    !!conditions &&
    conditions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardList className="h-5 w-5" />
          Conditions
        </h2>
        {canWriteConditions && (
          <span className="ml-auto">
            <AddConditionDialog disabled={creating} onSubmit={onCreate} />
          </span>
        )}
      </div>

      {showLoadingState && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead>Recorder</TableHead>
                <TableHead>Note</TableHead>
                {canWriteConditions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
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
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  {canWriteConditions && (
                    <TableCell>
                      <Skeleton className="h-8 w-36" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showErrorState && (
        <ErrorState message="Failed to load conditions" onRetry={onRetry} />
      )}

      {showEmptyState && (
        <EmptyState
          icon={ClipboardList}
          title="No conditions"
          subtitle="No documented conditions for this patient yet."
        />
      )}

      {showTable && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead>Recorder</TableHead>
                <TableHead>Note</TableHead>
                {canWriteConditions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditions.map((condition) => (
                <TableRow key={condition.id}>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div>{condition.diagnosis}</div>
                      {condition.snomedCode && (
                        <div className="text-xs text-muted-foreground">
                          SNOMED: {condition.snomedCode}
                        </div>
                      )}
                    </div>
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
                  <TableCell>{condition.note ?? "—"}</TableCell>
                  {canWriteConditions && (
                    <TableCell className="w-52">
                      <div className="flex gap-2">
                        <Select
                          disabled={updating}
                          onValueChange={(nextStatus: string) => {
                            if (
                              nextStatus !== "inactive" &&
                              nextStatus !== "resolved" &&
                              nextStatus !== "entered-in-error"
                            ) {
                              return;
                            }
                            onStatusUpdate(
                              condition.id,
                              nextStatus as UpdatableConditionStatus,
                              {
                                onSuccess: () => {
                                  toast.success("Condition status updated");
                                },
                                onError: (error) => {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to update condition status",
                                  );
                                },
                              },
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Set status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inactive">
                              Mark inactive
                            </SelectItem>
                            <SelectItem value="resolved">
                              Mark resolved
                            </SelectItem>
                            <SelectItem value="entered-in-error">
                              Entered in error
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleting}
                          onClick={() => {
                            onDelete(condition.id, {
                              onSuccess: () => {
                                toast.success("Condition removed");
                              },
                              onError: (error) => {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to remove condition",
                                );
                              },
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
