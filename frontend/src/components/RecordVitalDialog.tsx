import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import type { VitalsDTO } from "@fhir-mern/shared";
import { VITAL_PRESETS } from "@/lib/constants";
import { createPortalVital, createVital } from "@/lib/vitals.api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecordVitalDialogProps {
  patientId?: string;
  mode?: "clinical" | "portal";
  buttonLabel?: string;
}

export function RecordVitalDialog({
  patientId,
  mode = "clinical",
  buttonLabel,
}: RecordVitalDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();

  const preset = VITAL_PRESETS.find((p) => p.code === selectedCode);

  const numValue = Number(value.trim());
  const isValueValid =
    value.trim() !== "" && !Number.isNaN(numValue) && numValue > 0;

  const mutation = useMutation({
    mutationFn: () => {
      if (!preset) throw new Error("Select a vital type");
      if (!isValueValid) throw new Error("Enter a valid positive number");
      if (mode === "clinical" && !patientId) {
        throw new Error("Patient ID is required");
      }

      const payload = {
        code: preset.code,
        display: preset.display,
        value: numValue,
        unit: preset.unit,
        unitCode: preset.unitCode,
      };

      return mode === "portal"
        ? createPortalVital(payload)
        : createVital(patientId!, payload);
    },
    onSuccess: (newVital) => {
      const queryKey =
        mode === "portal" ? ["portal", "vitals"] : ["vitals", patientId!];
      queryClient.setQueryData(queryKey, (old: VitalsDTO[] | undefined) =>
        old ? [newVital, ...old] : [newVital],
      );
      void queryClient.invalidateQueries({ queryKey });
      toast.success(
        mode === "portal"
          ? "Reading submitted successfully"
          : "Vital sign recorded",
      );
      resetAndClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record vital");
    },
  });

  function resetAndClose() {
    setOpen(false);
    setSelectedCode("");
    setValue("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetAndClose();
    } else {
      setOpen(true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {buttonLabel ??
            (mode === "portal" ? "Submit Reading" : "Record Vital")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "portal" ? "Submit Reading" : "Record Vital Sign"}
          </DialogTitle>
          <DialogDescription>
            {mode === "portal"
              ? "Add your own vital sign reading."
              : "Add a new vital sign reading for this patient."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="vital-type">Vital Type</Label>
            <Select value={selectedCode} onValueChange={setSelectedCode}>
              <SelectTrigger id="vital-type">
                <SelectValue placeholder="Select vital type" />
              </SelectTrigger>
              <SelectContent>
                {VITAL_PRESETS.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vital-value">
              Value{preset ? ` (${preset.unit})` : ""}
            </Label>
            <Input
              id="vital-value"
              type="number"
              step="any"
              min="0.01"
              placeholder={preset ? `e.g. ${preset.example}` : "Enter value"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!selectedCode || !isValueValid || mutation.isPending}
            >
              {mutation.isPending ? "Recording..." : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
