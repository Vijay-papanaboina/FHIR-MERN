import type { PatientDTO } from "@fhir-mern/shared";
import type {
  AssignmentDTO,
  PractitionerSummaryDTO,
} from "@/lib/assignment.api";
import { GENDER_VARIANT } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientInfoCardProps {
  patient: PatientDTO | undefined;
  patientLoading: boolean;
  patientError: boolean;
  onRetryPatient: () => void;
  isAdmin: boolean;
  assignments: AssignmentDTO[] | undefined;
  assignmentsLoading: boolean;
  assignmentsError: boolean;
  onRetryAssignments: () => void;
  practitioners: PractitionerSummaryDTO[] | undefined;
  practitionersError: boolean;
  onRetryPractitioners: () => void;
}

export function PatientInfoCard({
  patient,
  patientLoading,
  patientError,
  onRetryPatient,
  isAdmin,
  assignments,
  assignmentsLoading,
  assignmentsError,
  onRetryAssignments,
  practitioners,
  practitionersError,
  onRetryPractitioners,
}: PatientInfoCardProps) {
  const practitionerById = new Map(
    (practitioners ?? []).map((p) => [p._id, p.name] as const),
  );

  if (patientLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardHeader>
        <CardContent className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </CardContent>
      </Card>
    );
  }

  if (patientError && !patient) {
    return (
      <Card>
        <CardContent className="py-6">
          <ErrorState
            message="Failed to load patient details"
            onRetry={onRetryPatient}
          />
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{patient.displayName}</CardTitle>
        <CardDescription>Patient ID: {patient.id}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Date of Birth: </span>
          <span className="font-medium">{formatDate(patient.birthDate)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Gender: </span>
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
                    onRetryAssignments();
                    onRetryPractitioners();
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
  );
}
