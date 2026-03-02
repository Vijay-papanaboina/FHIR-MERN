import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import type {
  AppointmentDTO,
  CreateAppointmentRequestInput,
  UpdateAppointmentDecisionInput,
} from "@fhir-mern/shared";
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

interface PatientAppointmentsTabProps {
  appointments: AppointmentDTO[] | undefined;
  appointmentsLoading: boolean;
  appointmentsError: boolean;
  onRetry: () => void;
  canWriteAppointments: boolean;
  canCreateAppointments: boolean;
  careTeamOptions: AppointmentCareTeamOption[];
  updating: boolean;
  creating: boolean;
  onCreate: (input: CreateAppointmentRequestInput) => Promise<void>;
  onDecide: (
    appointmentId: string,
    input: UpdateAppointmentDecisionInput,
    options?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    },
  ) => void;
}

export function PatientAppointmentsTab({
  appointments,
  appointmentsLoading,
  appointmentsError,
  onRetry,
  canWriteAppointments,
  canCreateAppointments,
  careTeamOptions,
  updating,
  creating,
  onCreate,
  onDecide,
}: PatientAppointmentsTabProps) {
  const upcoming = (appointments ?? []).filter(
    (appointment) =>
      appointment.lifecycleStatus === "requested" ||
      appointment.lifecycleStatus === "confirmed",
  );
  const history = (appointments ?? []).filter(
    (appointment) =>
      appointment.lifecycleStatus === "declined" ||
      appointment.lifecycleStatus === "cancelled",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-5 w-5" />
          Appointments
        </h2>
        {canCreateAppointments && (
          <span className="ml-auto">
            <RequestAppointmentDialog
              careTeamOptions={careTeamOptions}
              disabled={creating || careTeamOptions.length === 0}
              onSubmit={onCreate}
            />
          </span>
        )}
      </div>

      {appointmentsLoading && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Practitioner</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                {canWriteAppointments && <TableHead>Actions</TableHead>}
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
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  {canWriteAppointments && (
                    <TableCell>
                      <Skeleton className="h-8 w-28" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!appointmentsLoading && appointmentsError && (
        <ErrorState message="Failed to load appointments" onRetry={onRetry} />
      )}

      {!appointmentsLoading &&
        !appointmentsError &&
        appointments &&
        appointments.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="No appointments yet"
            subtitle="No appointment requests found for this patient."
          />
        )}

      {!appointmentsLoading &&
        !appointmentsError &&
        appointments &&
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
                  {canWriteAppointments && <TableHead>Actions</TableHead>}
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
                    {canWriteAppointments && (
                      <TableCell>
                        <div className="flex gap-2">
                          {appointment.lifecycleStatus === "requested" && (
                            <>
                              <Button
                                size="sm"
                                disabled={updating}
                                onClick={() => {
                                  onDecide(
                                    appointment.id,
                                    { status: "confirmed" },
                                    {
                                      onSuccess: () =>
                                        toast.success("Appointment confirmed"),
                                      onError: (error) =>
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Failed to confirm appointment",
                                        ),
                                    },
                                  );
                                }}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={updating}
                                onClick={() => {
                                  onDecide(
                                    appointment.id,
                                    { status: "declined" },
                                    {
                                      onSuccess: () =>
                                        toast.success("Appointment declined"),
                                      onError: (error) =>
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Failed to decline appointment",
                                        ),
                                    },
                                  );
                                }}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {appointment.lifecycleStatus === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updating}
                              onClick={() => {
                                onDecide(
                                  appointment.id,
                                  { status: "cancelled" },
                                  {
                                    onSuccess: () =>
                                      toast.success("Appointment cancelled"),
                                    onError: (error) =>
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : "Failed to cancel appointment",
                                      ),
                                  },
                                );
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      {!appointmentsLoading &&
        !appointmentsError &&
        appointments &&
        history.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-base font-semibold">History</h3>
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
