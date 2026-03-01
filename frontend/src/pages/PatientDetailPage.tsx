import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Activity, Pill } from "lucide-react";
import { toast } from "sonner";

import { GENDER_VARIANT } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { usePatient, usePatientAssignmentRole } from "@/hooks/use-patient";
import { useVitals } from "@/hooks/use-vitals";
import {
  useMedications,
  useUpdateMedicationStatus,
} from "@/hooks/use-medications";
import {
  usePatientAssignments,
  usePractitioners,
} from "@/hooks/use-assignments";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import { VitalsChart } from "@/components/VitalsChart";
import { RecordVitalDialog } from "@/components/RecordVitalDialog";
import { PrescribeMedicationDialog } from "@/components/PrescribeMedicationDialog";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function PatientDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"vitals" | "medications">(
    "vitals",
  );
  const { role } = useResolvedRole();
  const isAdmin = role === "admin";
  const isPractitioner = role === "practitioner";
  const {
    data: patient,
    isPending: patientLoading,
    isError: patientError,
    refetch: refetchPatient,
  } = usePatient(id);
  const {
    data: vitals,
    isPending: vitalsLoading,
    isError: vitalsError,
    refetch: refetchVitals,
  } = useVitals(id);
  const { data: assignmentRoleData } = usePatientAssignmentRole(
    id,
    isPractitioner,
  );
  const {
    data: medications,
    isPending: medicationsLoading,
    isError: medicationsError,
    refetch: refetchMedications,
  } = useMedications(id);
  const updateMedicationStatus = useUpdateMedicationStatus(id);
  const {
    data: assignments,
    isPending: assignmentsLoading,
    isError: assignmentsError,
    refetch: refetchAssignments,
  } = usePatientAssignments(id, isAdmin);
  const {
    data: practitioners,
    isError: practitionersError,
    refetch: refetchPractitioners,
  } = usePractitioners(isAdmin);
  const practitionerById = new Map(
    (practitioners ?? []).map((p) => [p._id, p.name] as const),
  );
  const assignmentRole = assignmentRoleData?.assignmentRole;
  const canWriteMedications =
    isAdmin || assignmentRole === "primary" || assignmentRole === "covering";
  const activeMedications = useMemo(
    () =>
      (medications ?? []).filter(
        (medication) => medication.status === "active",
      ),
    [medications],
  );
  const nonActiveMedications = useMemo(
    () =>
      (medications ?? []).filter(
        (medication) =>
          medication.status === "completed" || medication.status === "stopped",
      ),
    [medications],
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard/patients")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to patients
      </Button>

      {/* Patient info card */}
      {patientLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </CardHeader>
          <CardContent className="flex gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </CardContent>
        </Card>
      )}

      {patientError && !patient && (
        <Card>
          <CardContent className="py-6">
            <ErrorState
              message="Failed to load patient details"
              onRetry={refetchPatient}
            />
          </CardContent>
        </Card>
      )}

      {patient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl"> {patient.displayName} </CardTitle>
            <CardDescription> Patient ID: {patient.id} </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground"> Date of Birth: </span>
              <span className="font-medium">
                {" "}
                {formatDate(patient.birthDate)}{" "}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground"> Gender: </span>
              <Badge
                variant={GENDER_VARIANT[patient.gender] ?? "outline"}
                className="capitalize"
              >
                {patient.gender}
              </Badge>
            </div>
          </CardContent>

          {isAdmin && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-sm font-medium">Assigned To</p>
                {assignmentsLoading && <Skeleton className="h-6 w-52" />}
                {!assignmentsLoading &&
                  (assignmentsError || practitionersError) && (
                    <ErrorState
                      message="Failed to load assignment details"
                      onRetry={() => {
                        void refetchAssignments();
                        void refetchPractitioners();
                      }}
                    />
                  )}
                {!assignmentsLoading &&
                  !assignmentsError &&
                  !practitionersError &&
                  (!assignments || assignments.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No active practitioner assignments.
                    </p>
                  )}
                {!assignmentsLoading &&
                  !assignmentsError &&
                  !practitionersError &&
                  assignments &&
                  assignments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assignments.map((assignment) => (
                        <Badge key={assignment._id} variant="outline">
                          {practitionerById.get(assignment.assignedUserId) ??
                            assignment.assignedUserId}
                          {" · "}
                          <span className="capitalize">
                            {assignment.assignmentRole}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Clinical tabs */}
      <div className="flex items-center gap-2 rounded-lg border p-1 w-fit">
        <Button
          size="sm"
          variant={activeTab === "vitals" ? "default" : "ghost"}
          onClick={() => setActiveTab("vitals")}
        >
          <Activity className="mr-2 h-4 w-4" />
          Vitals
        </Button>
        <Button
          size="sm"
          variant={activeTab === "medications" ? "default" : "ghost"}
          onClick={() => setActiveTab("medications")}
        >
          <Pill className="mr-2 h-4 w-4" />
          Medications
        </Button>
      </div>

      {activeTab === "vitals" && (
        <>
          {/* Vitals chart */}
          {vitalsLoading && (
            <Skeleton className="h-[300px] w-full rounded-xl" />
          )}
          {vitals && vitals.length > 0 && <VitalsChart vitals={vitals} />}

          {/* Vitals section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vital Signs
              </h2>
              <span className="ml-auto">
                <RecordVitalDialog patientId={id} />
              </span>
            </div>

            {vitalsLoading && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type </TableHead>
                      <TableHead> Value </TableHead>
                      <TableHead> Recorded </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {vitalsError && !vitals && (
              <ErrorState
                message="Failed to load vitals"
                onRetry={refetchVitals}
              />
            )}

            {vitals && vitals.length === 0 && (
              <EmptyState
                icon={Activity}
                title="No vitals recorded"
                subtitle="No vital sign observations found for this patient"
              />
            )}

            {vitals && vitals.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type </TableHead>
                      <TableHead> Value </TableHead>
                      <TableHead> Recorded </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vitals.map((vital) => (
                      <TableRow key={vital.id}>
                        <TableCell className="font-medium">
                          {vital.type}
                        </TableCell>
                        <TableCell>
                          {vital.value != null
                            ? `${vital.value} ${vital.unit ?? ""}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(vital.recordedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "medications" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medications
            </h2>
            {canWriteMedications && (
              <span className="ml-auto">
                <PrescribeMedicationDialog patientId={id} />
              </span>
            )}
          </div>

          {medicationsLoading && (
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

          {medicationsError && !medications && (
            <ErrorState
              message="Failed to load medications"
              onRetry={refetchMedications}
            />
          )}

          {medications && activeMedications.length === 0 && (
            <EmptyState
              icon={Pill}
              title="No active medications"
              subtitle="No active prescriptions found for this patient."
            />
          )}

          {medications && activeMedications.length > 0 && (
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
                      <TableCell>
                        {medication.dosageInstructions ?? "—"}
                      </TableCell>
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
                            MEDICATION_STATUS_BADGE_VARIANT[
                              medication.status
                            ] ?? "outline"
                          }
                          className="capitalize"
                        >
                          {medication.status}
                        </Badge>
                      </TableCell>
                      {canWriteMedications && (
                        <TableCell className="w-40">
                          <Select
                            disabled={updateMedicationStatus.isPending}
                            onValueChange={(nextStatus: string) => {
                              if (
                                nextStatus !== "completed" &&
                                nextStatus !== "stopped"
                              ) {
                                return;
                              }
                              updateMedicationStatus.mutate(
                                {
                                  medicationId: medication.id,
                                  status: nextStatus,
                                },
                                {
                                  onSuccess: () => {
                                    toast.success("Medication status updated");
                                  },
                                  onError: (err) => {
                                    toast.error(
                                      err instanceof Error
                                        ? err.message
                                        : "Failed to update medication status",
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
                              <SelectItem value="completed">
                                Mark completed
                              </SelectItem>
                              <SelectItem value="stopped">
                                Mark stopped
                              </SelectItem>
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

          {medications && nonActiveMedications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Medication History</CardTitle>
                <CardDescription>
                  Completed and stopped prescriptions.
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
      )}
    </div>
  );
}
