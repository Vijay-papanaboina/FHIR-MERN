import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { CreateAllergyInput } from "@fhir-mern/shared";
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

interface AddAllergyDialogProps {
  disabled?: boolean;
  onSubmit: (input: CreateAllergyInput) => Promise<void>;
}

const todayDateInput = (): string => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function AddAllergyDialog({
  disabled = false,
  onSubmit,
}: AddAllergyDialogProps) {
  const initialDate = useMemo(() => todayDateInput(), []);

  const [open, setOpen] = useState(false);
  const [substance, setSubstance] = useState("");
  const [snomedCode, setSnomedCode] = useState("");
  const [recordedDate, setRecordedDate] = useState(initialDate);
  const [reaction, setReaction] = useState("");
  const [note, setNote] = useState("");
  const [criticality, setCriticality] = useState<
    "low" | "high" | "unable-to-assess" | ""
  >("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = substance.trim().length > 0 && recordedDate.trim().length > 0;

  const resetAndClose = () => {
    setOpen(false);
    setSubstance("");
    setSnomedCode("");
    setRecordedDate(initialDate);
    setReaction("");
    setNote("");
    setCriticality("");
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
      toast.error("Substance and recorded date are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        substance: substance.trim(),
        recordedDate,
        ...(snomedCode.trim() ? { snomedCode: snomedCode.trim() } : {}),
        ...(reaction.trim() ? { reaction: reaction.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(criticality ? { criticality } : {}),
      });
      toast.success("Allergy added");
      resetAndClose();
    } catch (error) {
      setIsSubmitting(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to add allergy",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add Allergy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Allergy</DialogTitle>
          <DialogDescription>
            Record an allergy or intolerance for this patient.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="allergy-substance">Substance</Label>
            <Input
              id="allergy-substance"
              value={substance}
              onChange={(event) => setSubstance(event.target.value)}
              placeholder="e.g. Penicillin"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergy-snomed">SNOMED code (optional)</Label>
            <Input
              id="allergy-snomed"
              value={snomedCode}
              onChange={(event) => setSnomedCode(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="allergy-recorded-date">Recorded date</Label>
              <Input
                id="allergy-recorded-date"
                type="date"
                value={recordedDate}
                onChange={(event) => setRecordedDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergy-criticality">Criticality</Label>
              <Select
                value={criticality}
                onValueChange={(value: string) =>
                  setCriticality(
                    value as "low" | "high" | "unable-to-assess" | "",
                  )
                }
              >
                <SelectTrigger id="allergy-criticality">
                  <SelectValue placeholder="Select criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="unable-to-assess">
                    Unable to assess
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergy-reaction">Reaction (optional)</Label>
            <Input
              id="allergy-reaction"
              value={reaction}
              onChange={(event) => setReaction(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergy-note">Note (optional)</Label>
            <Input
              id="allergy-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Allergy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
