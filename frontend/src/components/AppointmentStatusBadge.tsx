import type { AppointmentLifecycleStatus } from "@fhir-mern/shared";
import { Badge } from "@/components/ui/badge";

const APPOINTMENT_STATUS_VARIANT = {
  requested: "outline",
  confirmed: "default",
  declined: "destructive",
  cancelled: "secondary",
} as const;

interface AppointmentStatusBadgeProps {
  status: AppointmentLifecycleStatus;
}

export function AppointmentStatusBadge({
  status,
}: AppointmentStatusBadgeProps) {
  return (
    <Badge
      variant={APPOINTMENT_STATUS_VARIANT[status] ?? "outline"}
      className="capitalize"
    >
      {status}
    </Badge>
  );
}
