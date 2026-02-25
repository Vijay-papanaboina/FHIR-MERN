import { useParams, useNavigate } from "react-router"
import { ArrowLeft, Activity } from "lucide-react"

import { GENDER_VARIANT } from "@/lib/constants"
import { formatDate, formatDateTime } from "@/lib/format"
import { usePatient } from "@/hooks/use-patient"
import { useVitals } from "@/hooks/use-vitals"
import { VitalsChart } from "@/components/VitalsChart"
import { RecordVitalDialog } from "@/components/RecordVitalDialog"
import { EmptyState, ErrorState } from "@/components/StateViews"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function PatientDetailPage() {
    const { id = "" } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: patient, isPending: patientLoading, isError: patientError, refetch: refetchPatient } = usePatient(id)
    const { data: vitals, isPending: vitalsLoading, isError: vitalsError, refetch: refetchVitals } = useVitals(id)

    return (
        <div className= "space-y-6" >
        {/* Back button */ }
        < Button
    variant = "ghost"
    size = "sm"
    onClick = {() => navigate("/dashboard/patients")
}
            >
    <ArrowLeft className="mr-2 h-4 w-4" />
        Back to patients
            </Button>

{/* Patient info card */ }
{
    patientLoading && (
        <Card>
        <CardHeader>
        <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
                </CardHeader>
                < CardContent className = "flex gap-4" >
                    <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-20" />
                            </CardContent>
                            </Card>
            )
}

{
    patientError && !patient && (
        <Card>
        <CardContent className="py-6" >
            <ErrorState
                            message="Failed to load patient details"
    onRetry = { refetchPatient }
        />
        </CardContent>
        </Card>
            )
}

{
    patient && (
        <Card>
        <CardHeader>
        <CardTitle className="text-xl" > { patient.displayName } </CardTitle>
            < CardDescription > Patient ID: { patient.id } </CardDescription>
                </CardHeader>
                < CardContent className = "flex flex-wrap gap-4 text-sm" >
                    <div>
                    <span className="text-muted-foreground" > Date of Birth: </span>
                        < span className = "font-medium" > { formatDate(patient.birthDate) } </span>
                            </div>
                            < div >
                            <span className="text-muted-foreground" > Gender: </span>
                                < Badge
    variant = { GENDER_VARIANT[patient.gender] ?? "outline" }
    className = "capitalize"
        >
        { patient.gender }
        </Badge>
        </div>
        </CardContent>
        </Card>
            )
}

{/* Vitals chart */ }
{
    vitalsLoading && (
        <Skeleton className="h-[300px] w-full rounded-xl" />
            )
}
{ vitals && vitals.length > 0 && <VitalsChart vitals={ vitals } /> }

{/* Vitals section */ }
<div>
    <div className="flex items-center gap-2 mb-4" >
        <h2 className="text-lg font-semibold flex items-center gap-2" >
            <Activity className="h-5 w-5" />
                Vital Signs
                    </h2>
                    < span className = "ml-auto" >
                        <RecordVitalDialog patientId={ id } />
                            </span>
                            </div>

{
    vitalsLoading && (
        <div className="rounded-md border" >
            <Table>
            <TableHeader>
            <TableRow>
            <TableHead>Type </TableHead>
            < TableHead > Value </TableHead>
            < TableHead > Recorded </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
    {
        Array.from({ length: 4 }).map((_, i) => (
            <TableRow key= { i } >
            <TableCell><Skeleton className="h-4 w-32" /> </TableCell>
            < TableCell > <Skeleton className="h-4 w-20" /> </TableCell>
            < TableCell > <Skeleton className="h-4 w-28" /> </TableCell>
        </TableRow>
        ))
    }
    </TableBody>
        </Table>
        </div>
                )
}

{
    vitalsError && !vitals && (
        <ErrorState
                        message="Failed to load vitals"
    onRetry = { refetchVitals }
        />
                )
}

{
    vitals && vitals.length === 0 && (
        <EmptyState
                        icon={ Activity }
    title = "No vitals recorded"
    subtitle = "No vital sign observations found for this patient"
        />
                )
}

{
    vitals && vitals.length > 0 && (
        <div className="rounded-md border" >
            <Table>
            <TableHeader>
            <TableRow>
            <TableHead>Type </TableHead>
            < TableHead > Value </TableHead>
            < TableHead > Recorded </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
    {
        vitals.map((vital) => (
            <TableRow key= { vital.id } >
            <TableCell className="font-medium" >
            { vital.type }
        </TableCell>
        <TableCell>
                                            {
                vital.value != null
                    ? `${vital.value} ${vital.unit ?? ""}`
                    : "—"
            }
            </TableCell>
            <TableCell>
                                            { formatDateTime(vital.recordedAt)
    }
    </TableCell>
        </TableRow>
                                ))
}
</TableBody>
    </Table>
    </div>
                )}
</div>
    </div>
    )
}
