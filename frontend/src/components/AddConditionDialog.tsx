import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { CreateConditionInput } from "@fhir-mern/shared";
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

interface AddConditionDialogProps {
  disabled?: boolean;
  onSubmit: (input: CreateConditionInput) => Promise<void>;
}

const todayDateInput = (): string => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function AddConditionDialog({
  disabled = false,
  onSubmit,
}: AddConditionDialogProps) {
  const initialDate = useMemo(() => todayDateInput(), []);

  const [open, setOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [snomedCode, setSnomedCode] = useState("");
  const [recordedDate, setRecordedDate] = useState(initialDate);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = diagnosis.trim().length > 0 && recordedDate.trim().length > 0;

  const resetAndClose = () => {
    setOpen(false);
    setDiagnosis("");
    setSnomedCode("");
    setRecordedDate(initialDate);
    setNote("");
    setIsSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }
    resetAndClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      toast.error("Diagnosis and recorded date are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        diagnosis: diagnosis.trim(),
        recordedDate,
        ...(snomedCode.trim() ? { snomedCode: snomedCode.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success("Condition added");
      resetAndClose();
    } catch (error) {
      setIsSubmitting(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to add condition",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add Condition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Condition</DialogTitle>
          <DialogDescription>
            Record a diagnosis or active condition for this patient.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="condition-diagnosis">Diagnosis</Label>
            <Input
              id="condition-diagnosis"
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              placeholder="e.g. Essential hypertension"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition-snomed">SNOMED code (optional)</Label>
            <Input
              id="condition-snomed"
              value={snomedCode}
              onChange={(event) => setSnomedCode(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition-recorded-date">Recorded date</Label>
            <Input
              id="condition-recorded-date"
              type="date"
              value={recordedDate}
              onChange={(event) => setRecordedDate(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition-note">Note (optional)</Label>
            <Input
              id="condition-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Condition"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
