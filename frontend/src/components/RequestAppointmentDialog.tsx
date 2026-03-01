import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { CreateAppointmentRequestInput } from "@fhir-mern/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AppointmentCareTeamOption {
  userId: string;
  label: string;
  role: "primary" | "covering" | "consulting";
}

interface RequestAppointmentDialogProps {
  careTeamOptions: AppointmentCareTeamOption[];
  submitLabel?: string;
  triggerLabel?: string;
  disabled?: boolean;
  onSubmit: (input: CreateAppointmentRequestInput) => Promise<void>;
}

const formatDateTimeLocal = (input: Date): string => {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  const hours = String(input.getHours()).padStart(2, "0");
  const minutes = String(input.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoFromLocalInput = (value: string): string | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export function RequestAppointmentDialog({
  careTeamOptions,
  submitLabel = "Request Appointment",
  triggerLabel = "Request Appointment",
  disabled = false,
  onSubmit,
}: RequestAppointmentDialogProps) {
  const nowPlusHour = useMemo(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return formatDateTimeLocal(next);
  }, []);
  const nowPlusNinetyMinutes = useMemo(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 30, 0, 0);
    return formatDateTimeLocal(next);
  }, []);

  const [open, setOpen] = useState(false);
  const [careTeamUserId, setCareTeamUserId] = useState("");
  const [start, setStart] = useState(nowPlusHour);
  const [end, setEnd] = useState(nowPlusNinetyMinutes);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasOptions = careTeamOptions.length > 0;
  const isValid =
    hasOptions &&
    careTeamUserId.trim().length > 0 &&
    start.trim().length > 0 &&
    end.trim().length > 0;

  function resetAndClose() {
    setOpen(false);
    setCareTeamUserId("");
    setStart(nowPlusHour);
    setEnd(nowPlusNinetyMinutes);
    setReason("");
    setNote("");
    setIsSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
      return;
    }
    resetAndClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) {
      toast.error("Please complete all required fields");
      return;
    }

    const normalizedStart = toIsoFromLocalInput(start);
    const normalizedEnd = toIsoFromLocalInput(end);
    if (!normalizedStart || !normalizedEnd) {
      toast.error("Please enter valid start and end date/time");
      return;
    }
    if (
      new Date(normalizedEnd).getTime() <= new Date(normalizedStart).getTime()
    ) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        careTeamUserId: careTeamUserId.trim(),
        start: normalizedStart,
        end: normalizedEnd,
        ...(reason.trim().length > 0 ? { reason: reason.trim() } : {}),
        ...(note.trim().length > 0 ? { note: note.trim() } : {}),
      });
      toast.success("Appointment request submitted");
      resetAndClose();
    } catch (error) {
      setIsSubmitting(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to request appointment",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled || !hasOptions}>
          <Plus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Appointment</DialogTitle>
          <DialogDescription>
            Select a care-team practitioner and preferred schedule.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="care-team-user">Care Team Practitioner</Label>
            <Select value={careTeamUserId} onValueChange={setCareTeamUserId}>
              <SelectTrigger id="care-team-user">
                <SelectValue placeholder="Select practitioner" />
              </SelectTrigger>
              <SelectContent>
                {careTeamOptions.map((option) => (
                  <SelectItem key={option.userId} value={option.userId}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appointment-start">Start</Label>
              <Input
                id="appointment-start"
                type="datetime-local"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment-end">End</Label>
              <Input
                id="appointment-end"
                type="datetime-local"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-reason">Reason (optional)</Label>
            <Input
              id="appointment-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Follow-up for blood pressure review"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-note">Note (optional)</Label>
            <Input
              id="appointment-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Any extra scheduling details"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Submitting..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
