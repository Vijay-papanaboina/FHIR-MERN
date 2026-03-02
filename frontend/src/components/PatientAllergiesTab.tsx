import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { AllergyDTO, UpdatableAllergyStatus } from "@fhir-mern/shared";
import { formatDate } from "@/lib/format";
import { AddAllergyDialog } from "@/components/AddAllergyDialog";
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

const ALLERGY_STATUS_BADGE_VARIANT = {
  active: "default",
  inactive: "secondary",
  resolved: "outline",
  "entered-in-error": "destructive",
  unknown: "outline",
} as const;

interface PatientAllergiesTabProps {
  allergies: AllergyDTO[] | undefined;
  allergiesLoading: boolean;
  allergiesError: boolean;
  onRetry: () => void;
  canWriteAllergies: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  onCreate: (input: {
    substance: string;
    snomedCode?: string;
    recordedDate: string;
    reaction?: string;
    note?: string;
    criticality?: "low" | "high" | "unable-to-assess";
  }) => Promise<void>;
  onStatusUpdate: (
    allergyId: string,
    status: UpdatableAllergyStatus,
    options?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    },
  ) => void;
  onDelete: (
    allergyId: string,
    options?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    },
  ) => void;
}

export function PatientAllergiesTab({
  allergies,
  allergiesLoading,
  allergiesError,
  onRetry,
  canWriteAllergies,
  creating,
  updating,
  deleting,
  onCreate,
  onStatusUpdate,
  onDelete,
}: PatientAllergiesTabProps) {
  const showLoadingState = allergiesLoading && !allergies;
  const showErrorState = !showLoadingState && allergiesError && !allergies;
  const showEmptyState =
    !showLoadingState &&
    !showErrorState &&
    !!allergies &&
    allergies.length === 0;
  const showTable =
    !showLoadingState && !showErrorState && !!allergies && allergies.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldAlert className="h-5 w-5" />
          Allergies
        </h2>
        {canWriteAllergies && (
          <span className="ml-auto">
            <AddAllergyDialog disabled={creating} onSubmit={onCreate} />
          </span>
        )}
      </div>

      {showLoadingState && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Substance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Recorded</TableHead>
                {canWriteAllergies && <TableHead>Actions</TableHead>}
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  {canWriteAllergies && (
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
        <ErrorState message="Failed to load allergies" onRetry={onRetry} />
      )}

      {showEmptyState && (
        <EmptyState
          icon={ShieldAlert}
          title="No allergies"
          subtitle="No documented allergies for this patient yet."
        />
      )}

      {showTable && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Substance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Reaction</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead>Recorder</TableHead>
                {canWriteAllergies && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allergies.map((allergy) => (
                <TableRow key={allergy.id}>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div>{allergy.substance}</div>
                      {allergy.snomedCode && (
                        <div className="text-xs text-muted-foreground">
                          SNOMED: {allergy.snomedCode}
                        </div>
                      )}
                    </div>
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
                  <TableCell className="capitalize">
                    {allergy.criticality ?? "—"}
                  </TableCell>
                  <TableCell>{allergy.reaction ?? "—"}</TableCell>
                  <TableCell>{formatDate(allergy.recordedDate)}</TableCell>
                  <TableCell>{allergy.recorder ?? "—"}</TableCell>
                  {canWriteAllergies && (
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
                              allergy.id,
                              nextStatus as UpdatableAllergyStatus,
                              {
                                onSuccess: () => {
                                  toast.success("Allergy status updated");
                                },
                                onError: (error) => {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to update allergy status",
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
                            onDelete(allergy.id, {
                              onSuccess: () => {
                                toast.success("Allergy removed");
                              },
                              onError: (error) => {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to remove allergy",
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
