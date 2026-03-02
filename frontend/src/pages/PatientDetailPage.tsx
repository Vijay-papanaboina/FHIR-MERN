import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  Pill,
  ShieldAlert,
} from "lucide-react";
import { getSessionUserValue } from "@/lib/roles";
import {
  useCreatePatientAppointment,
  useDecidePatientAppointment,
  usePatientAppointments,
} from "@/hooks/use-appointments";
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
import {
  useConditions,
  useCreateCondition,
  useDeleteCondition,
  useUpdateConditionStatus,
} from "@/hooks/use-conditions";
import {
  useAllergies,
  useCreateAllergy,
  useDeleteAllergy,
  useUpdateAllergyStatus,
} from "@/hooks/use-allergies";
import { PatientInfoCard } from "@/components/PatientInfoCard";
import { PatientVitalsTab } from "@/components/PatientVitalsTab";
import { PatientMedicationsTab } from "@/components/PatientMedicationsTab";
import { PatientAppointmentsTab } from "@/components/PatientAppointmentsTab";
import { PatientConditionsTab } from "@/components/PatientConditionsTab";
import { PatientAllergiesTab } from "@/components/PatientAllergiesTab";
import { PatientDiagnosticsTab } from "@/components/PatientDiagnosticsTab";
import { Button } from "@/components/ui/button";
import { useDiagnostics } from "@/hooks/use-diagnostics";

type ActiveTab =
  | "vitals"
  | "medications"
  | "appointments"
  | "conditions"
  | "allergies"
  | "diagnostics";

export function PatientDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("vitals");

  const { role, session } = useResolvedRole();
  const isAdmin = role === "admin";
  const isPractitioner = role === "practitioner";

  const actorUserIdRaw = getSessionUserValue(session, "id");
  const actorUserId = typeof actorUserIdRaw === "string" ? actorUserIdRaw : "";
  const actorNameRaw = getSessionUserValue(session, "name");
  const actorName =
    typeof actorNameRaw === "string" && actorNameRaw.trim().length > 0
      ? actorNameRaw.trim()
      : "Assigned Practitioner";

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
    data: appointments,
    isPending: appointmentsLoading,
    isError: appointmentsError,
    refetch: refetchAppointments,
  } = usePatientAppointments(id);
  const createPatientAppointment = useCreatePatientAppointment(id);
  const decidePatientAppointment = useDecidePatientAppointment(id);
  const {
    data: conditions,
    isPending: conditionsLoading,
    isError: conditionsError,
    refetch: refetchConditions,
  } = useConditions(id);
  const {
    data: allergies,
    isPending: allergiesLoading,
    isError: allergiesError,
    refetch: refetchAllergies,
  } = useAllergies(id);
  const {
    data: diagnostics,
    isPending: diagnosticsLoading,
    isError: diagnosticsError,
    refetch: refetchDiagnostics,
  } = useDiagnostics(id);
  const createCondition = useCreateCondition(id);
  const updateConditionStatus = useUpdateConditionStatus(id);
  const deleteCondition = useDeleteCondition(id);
  const createAllergy = useCreateAllergy(id);
  const updateAllergyStatus = useUpdateAllergyStatus(id);
  const deleteAllergy = useDeleteAllergy(id);

  const {
    data: assignments,
    isPending: assignmentsLoading,
    isError: assignmentsError,
    refetch: refetchAssignments,
  } = usePatientAssignments(id, isAdmin);
  const {
    data: practitioners,
    isPending: practitionersLoading,
    isError: practitionersError,
    refetch: refetchPractitioners,
  } = usePractitioners(isAdmin);

  const assignmentRole = assignmentRoleData?.assignmentRole;
  const canWriteMedications =
    isAdmin || assignmentRole === "primary" || assignmentRole === "covering";
  const canWriteAppointments = canWriteMedications;
  const canCreateAppointments = canWriteAppointments;
  const canWriteConditions = canWriteMedications;
  const canWriteAllergies = canWriteMedications;

  const careTeamOptions = useMemo(() => {
    const options: Array<{
      userId: string;
      label: string;
      role: "primary" | "covering" | "consulting";
    }> = [];

    if (isAdmin) {
      const practitionerById = new Map(
        (practitioners ?? []).map((p) => [p._id, p.name] as const),
      );
      for (const assignment of assignments ?? []) {
        options.push({
          userId: assignment.assignedUserId,
          role: assignment.assignmentRole,
          label: `${
            practitionerById.get(assignment.assignedUserId) ??
            assignment.assignedUserId
          } (${assignment.assignmentRole})`,
        });
      }
    } else if (isPractitioner && canCreateAppointments && actorUserId) {
      options.push({
        userId: actorUserId,
        role:
          assignmentRole === "primary" ||
          assignmentRole === "covering" ||
          assignmentRole === "consulting"
            ? assignmentRole
            : "covering",
        label: `${actorName} (${assignmentRole ?? "assigned"})`,
      });
    }

    return Array.from(
      new Map(options.map((option) => [option.userId, option])).values(),
    );
  }, [
    isAdmin,
    isPractitioner,
    practitioners,
    assignments,
    canCreateAppointments,
    actorUserId,
    actorName,
    assignmentRole,
  ]);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard/patients")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to patients
      </Button>

      <PatientInfoCard
        patient={patient}
        patientLoading={patientLoading}
        patientError={patientError}
        onRetryPatient={() => {
          void refetchPatient();
        }}
        isAdmin={isAdmin}
        assignments={assignments}
        assignmentsLoading={assignmentsLoading}
        assignmentsError={assignmentsError}
        onRetryAssignments={() => {
          void refetchAssignments();
        }}
        practitioners={practitioners}
        practitionersLoading={practitionersLoading}
        practitionersError={practitionersError}
        onRetryPractitioners={() => {
          void refetchPractitioners();
        }}
      />

      <div className="flex w-fit items-center gap-2 rounded-lg border p-1">
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
        <Button
          size="sm"
          variant={activeTab === "appointments" ? "default" : "ghost"}
          onClick={() => setActiveTab("appointments")}
        >
          <CalendarClock className="mr-2 h-4 w-4" />
          Appointments
        </Button>
        <Button
          size="sm"
          variant={activeTab === "conditions" ? "default" : "ghost"}
          onClick={() => setActiveTab("conditions")}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Conditions
        </Button>
        <Button
          size="sm"
          variant={activeTab === "allergies" ? "default" : "ghost"}
          onClick={() => setActiveTab("allergies")}
        >
          <ShieldAlert className="mr-2 h-4 w-4" />
          Allergies
        </Button>
        <Button
          size="sm"
          variant={activeTab === "diagnostics" ? "default" : "ghost"}
          onClick={() => setActiveTab("diagnostics")}
        >
          <FlaskConical className="mr-2 h-4 w-4" />
          Diagnostics
        </Button>
      </div>

      {activeTab === "vitals" && (
        <PatientVitalsTab
          patientId={id}
          vitals={vitals}
          vitalsLoading={vitalsLoading}
          vitalsError={vitalsError}
          onRetry={() => {
            void refetchVitals();
          }}
        />
      )}

      {activeTab === "medications" && (
        <PatientMedicationsTab
          patientId={id}
          medications={medications}
          medicationsLoading={medicationsLoading}
          medicationsError={medicationsError}
          onRetry={() => {
            void refetchMedications();
          }}
          canWriteMedications={canWriteMedications}
          updatePending={updateMedicationStatus.isPending}
          onStatusUpdate={(medicationId, status, options) => {
            updateMedicationStatus.mutate(
              {
                medicationId,
                status,
              },
              {
                onSuccess: options?.onSuccess,
                onError: options?.onError,
              },
            );
          }}
        />
      )}

      {activeTab === "appointments" && (
        <PatientAppointmentsTab
          appointments={appointments}
          appointmentsLoading={appointmentsLoading}
          appointmentsError={appointmentsError}
          onRetry={() => {
            void refetchAppointments();
          }}
          canWriteAppointments={canWriteAppointments}
          canCreateAppointments={canCreateAppointments}
          careTeamOptions={careTeamOptions}
          creating={createPatientAppointment.isPending}
          updating={decidePatientAppointment.isPending}
          onCreate={async (input) => {
            await createPatientAppointment.mutateAsync(input);
          }}
          onDecide={(appointmentId, input, options) => {
            decidePatientAppointment.mutate(
              { appointmentId, input },
              {
                onSuccess: options?.onSuccess,
                onError: options?.onError,
              },
            );
          }}
        />
      )}

      {activeTab === "conditions" && (
        <PatientConditionsTab
          conditions={conditions}
          conditionsLoading={conditionsLoading}
          conditionsError={conditionsError}
          onRetry={() => {
            void refetchConditions();
          }}
          canWriteConditions={canWriteConditions}
          creating={createCondition.isPending}
          updating={updateConditionStatus.isPending}
          deleting={deleteCondition.isPending}
          onCreate={async (input) => {
            await createCondition.mutateAsync(input);
          }}
          onStatusUpdate={(conditionId, status, options) => {
            updateConditionStatus.mutate(
              { conditionId, status },
              {
                onSuccess: options?.onSuccess,
                onError: options?.onError,
              },
            );
          }}
          onDelete={(conditionId, options) => {
            deleteCondition.mutate(conditionId, {
              onSuccess: options?.onSuccess,
              onError: options?.onError,
            });
          }}
        />
      )}

      {activeTab === "allergies" && (
        <PatientAllergiesTab
          allergies={allergies}
          allergiesLoading={allergiesLoading}
          allergiesError={allergiesError}
          onRetry={() => {
            void refetchAllergies();
          }}
          canWriteAllergies={canWriteAllergies}
          creating={createAllergy.isPending}
          updating={updateAllergyStatus.isPending}
          deleting={deleteAllergy.isPending}
          onCreate={async (input) => {
            await createAllergy.mutateAsync(input);
          }}
          onStatusUpdate={(allergyId, status, options) => {
            updateAllergyStatus.mutate(
              { allergyId, status },
              {
                onSuccess: options?.onSuccess,
                onError: options?.onError,
              },
            );
          }}
          onDelete={(allergyId, options) => {
            deleteAllergy.mutate(allergyId, {
              onSuccess: options?.onSuccess,
              onError: options?.onError,
            });
          }}
        />
      )}

      {activeTab === "diagnostics" && (
        <PatientDiagnosticsTab
          patientId={id}
          diagnostics={diagnostics}
          diagnosticsLoading={diagnosticsLoading}
          diagnosticsError={diagnosticsError}
          onRetry={() => {
            void refetchDiagnostics();
          }}
        />
      )}
    </div>
  );
}
