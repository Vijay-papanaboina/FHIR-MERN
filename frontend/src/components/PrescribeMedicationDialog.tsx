import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useCreateMedication } from "@/hooks/use-medications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PrescribeMedicationDialogProps {
  patientId: string;
  disabled?: boolean;
}

export function PrescribeMedicationDialog({
  patientId,
  disabled = false,
}: PrescribeMedicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [drugName, setDrugName] = useState("");
  const [rxNormCode, setRxNormCode] = useState("");
  const [dosageInstructions, setDosageInstructions] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const createMedication = useCreateMedication(patientId);

  const isValid =
    drugName.trim().length > 0 &&
    dosageInstructions.trim().length > 0 &&
    frequency.trim().length > 0 &&
    startDate.trim().length > 0;

  function resetAndClose() {
    setOpen(false);
    setDrugName("");
    setRxNormCode("");
    setDosageInstructions("");
    setFrequency("");
    setStartDate("");
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

    try {
      await createMedication.mutateAsync({
        drugName: drugName.trim(),
        ...(rxNormCode.trim().length > 0
          ? { rxNormCode: rxNormCode.trim() }
          : {}),
        dosageInstructions: dosageInstructions.trim(),
        frequency: frequency.trim(),
        startDate,
      });
      toast.success("Medication prescribed");
      resetAndClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to prescribe");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Prescribe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Prescribe Medication</DialogTitle>
          <DialogDescription>
            Add a new medication request for this patient.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="drug-name">Drug Name</Label>
            <Input
              id="drug-name"
              value={drugName}
              onChange={(event) => setDrugName(event.target.value)}
              placeholder="e.g. Metformin 500mg"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rxnorm">RxNorm Code (optional)</Label>
            <Input
              id="rxnorm"
              value={rxNormCode}
              onChange={(event) => setRxNormCode(event.target.value)}
              placeholder="e.g. 860975"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dosage">Dosage Instructions</Label>
            <Input
              id="dosage"
              value={dosageInstructions}
              onChange={(event) => setDosageInstructions(event.target.value)}
              placeholder="e.g. Take 1 tablet by mouth"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Input
              id="frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
              placeholder="e.g. Twice daily"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!isValid || createMedication.isPending}
            >
              {createMedication.isPending ? "Prescribing..." : "Prescribe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
