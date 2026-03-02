import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { usePortalCareTeam } from "@/hooks/use-portal-care-team";
import {
  useCancelPortalAppointment,
  useCreatePortalAppointment,
  usePortalAppointments,
} from "@/hooks/use-appointments";
import { formatDateTime } from "@/lib/format";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import {
  RequestAppointmentDialog,
  type AppointmentCareTeamOption,
} from "@/components/RequestAppointmentDialog";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getPractitionerLabel(
  display: string | null,
  reference: string | null,
): string {
  if (display) return display;
  if (!reference) return "—";
  return reference.split("/")[1] || reference;
}

export function PortalAppointmentsPage() {
  const appointmentsQuery = usePortalAppointments(true);
  const careTeamQuery = usePortalCareTeam(true);
  const createAppointment = useCreatePortalAppointment();
  const cancelAppointment = useCancelPortalAppointment();

  const appointmentRows = useMemo(
    () => appointmentsQuery.data ?? [],
    [appointmentsQuery.data],
  );

  const upcoming = useMemo(
    () =>
      appointmentRows.filter(
        (appointment) =>
          appointment.lifecycleStatus === "requested" ||
          appointment.lifecycleStatus === "confirmed",
      ),
    [appointmentRows],
  );

  const history = useMemo(
    () =>
      appointmentRows.filter(
        (appointment) =>
          appointment.lifecycleStatus === "declined" ||
          appointment.lifecycleStatus === "cancelled",
      ),
    [appointmentRows],
  );

  const careTeamOptions = useMemo<AppointmentCareTeamOption[]>(
    () =>
      (careTeamQuery.data ?? []).map((member) => ({
        userId: member.userId,
        role: member.assignmentRole,
        label: `${member.name} (${member.assignmentRole})`,
      })),
    [careTeamQuery.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-muted-foreground">
            Request and manage your care-team appointments.
          </p>
        </div>
        <span className="ml-auto">
          <RequestAppointmentDialog
            careTeamOptions={careTeamOptions}
            disabled={
              careTeamOptions.length === 0 || createAppointment.isPending
            }
            onSubmit={async (payload) => {
              await createAppointment.mutateAsync(payload);
            }}
          />
        </span>
      </div>

      {(appointmentsQuery.isPending || careTeamQuery.isPending) && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Practitioner</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!appointmentsQuery.isPending &&
        !careTeamQuery.isPending &&
        (appointmentsQuery.isError || careTeamQuery.isError) && (
          <ErrorState
            message={
              appointmentsQuery.error?.message ??
              careTeamQuery.error?.message ??
              "Failed to load appointments"
            }
            onRetry={() => {
              void appointmentsQuery.refetch();
              void careTeamQuery.refetch();
            }}
          />
        )}

      {!appointmentsQuery.isPending &&
        !careTeamQuery.isPending &&
        !appointmentsQuery.isError &&
        !careTeamQuery.isError &&
        appointmentRows.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="No appointments yet"
            subtitle="Request your first appointment with your care team."
          />
        )}

      {!appointmentsQuery.isPending &&
        !careTeamQuery.isPending &&
        !appointmentsQuery.isError &&
        !careTeamQuery.isError &&
        upcoming.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Practitioner</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{formatDateTime(appointment.start)}</TableCell>
                    <TableCell>{formatDateTime(appointment.end)}</TableCell>
                    <TableCell>
                      {getPractitionerLabel(
                        appointment.practitionerDisplay,
                        appointment.practitionerReference,
                      )}
                    </TableCell>
                    <TableCell>{appointment.reason ?? "—"}</TableCell>
                    <TableCell>
                      <AppointmentStatusBadge
                        status={appointment.lifecycleStatus}
                      />
                    </TableCell>
                    <TableCell>
                      {(appointment.lifecycleStatus === "requested" ||
                        appointment.lifecycleStatus === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancelAppointment.isPending}
                          onClick={() => {
                            cancelAppointment.mutate(
                              { appointmentId: appointment.id },
                              {
                                onSuccess: () => {
                                  toast.success("Appointment cancelled");
                                },
                                onError: (error) => {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to cancel appointment",
                                  );
                                },
                              },
                            );
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      {!appointmentsQuery.isPending &&
        !careTeamQuery.isPending &&
        !appointmentsQuery.isError &&
        !careTeamQuery.isError &&
        history.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">History</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Practitioner</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>{formatDateTime(appointment.start)}</TableCell>
                      <TableCell>{formatDateTime(appointment.end)}</TableCell>
                      <TableCell>
                        {getPractitionerLabel(
                          appointment.practitionerDisplay,
                          appointment.practitionerReference,
                        )}
                      </TableCell>
                      <TableCell>{appointment.reason ?? "—"}</TableCell>
                      <TableCell>
                        <AppointmentStatusBadge
                          status={appointment.lifecycleStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
    </div>
  );
}
