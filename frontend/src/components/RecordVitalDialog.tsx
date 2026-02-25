import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import type { VitalsDTO } from "@fhir-mern/shared"
import { createVital } from "@/lib/vitals.api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

/** Predefined vital type presets with LOINC codes and units */
const VITAL_PRESETS = [
    { code: "8867-4", display: "Heart rate", unit: "beats/minute", unitCode: "/min", example: "72" },
    { code: "8310-5", display: "Body temperature", unit: "°C", unitCode: "Cel", example: "36.6" },
    { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg", unitCode: "mm[Hg]", example: "120" },
    { code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg", unitCode: "mm[Hg]", example: "80" },
    { code: "9279-1", display: "Respiratory rate", unit: "breaths/minute", unitCode: "/min", example: "16" },
    { code: "2708-6", display: "Oxygen saturation", unit: "%", unitCode: "%", example: "98" },
] as const

interface RecordVitalDialogProps {
    patientId: string
}

export function RecordVitalDialog({ patientId }: RecordVitalDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedCode, setSelectedCode] = useState("")
    const [value, setValue] = useState("")
    const queryClient = useQueryClient()

    const preset = VITAL_PRESETS.find((p) => p.code === selectedCode)

    const numValue = Number(value.trim())
    const isValueValid = value.trim() !== "" && !Number.isNaN(numValue) && numValue > 0

    const mutation = useMutation({
        mutationFn: () => {
            if (!preset) throw new Error("Select a vital type")
            if (!isValueValid) throw new Error("Enter a valid positive number")
            return createVital(patientId, {
                code: preset.code,
                display: preset.display,
                value: numValue,
                unit: preset.unit,
                unitCode: preset.unitCode,
            })
        },
        onSuccess: (newVital) => {
            // Prepend the server-returned vital to cache (newest first)
            queryClient.setQueryData(
                ["vitals", patientId],
                (old: VitalsDTO[] | undefined) => old ? [newVital, ...old] : [newVital],
            )
            // staleTime (30s) handles background refetch — no manual invalidation needed
            toast.success("Vital sign recorded")
            resetAndClose()
        },
        onError: (err) => {
            toast.error(err.message || "Failed to record vital")
        },
    })

    function resetAndClose() {
        setOpen(false)
        setSelectedCode("")
        setValue("")
    }

    function handleOpenChange(next: boolean) {
        if (!next) {
            resetAndClose()
        } else {
            setOpen(true)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Vital
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Vital Sign</DialogTitle>
                    <DialogDescription>
                        Add a new vital sign reading for this patient.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        mutation.mutate()
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
    )
}
