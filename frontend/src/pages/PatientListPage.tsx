import { useState } from "react"
import { useNavigate } from "react-router"
import { Search, AlertCircle } from "lucide-react"

import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { usePatients } from "@/hooks/use-patients"

const genderVariant: Record<"male" | "female" | "other" | "unknown", "default" | "secondary" | "outline"> = {
    male: "default",
    female: "secondary",
    other: "outline",
    unknown: "outline",
}

export function PatientListPage() {
    const navigate = useNavigate()
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebounce(search.trim(), 300)
    const { data: patients, isPending, isError, error, refetch } = usePatients(debouncedSearch)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
                <p className="text-muted-foreground">
                    Search and manage patient records
                </p>
            </div>

            {/* Search input */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* States */}
            {!debouncedSearch && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <Search className="mb-4 h-12 w-12 opacity-30" />
                    <p className="text-lg font-medium">Search for patients</p>
                    <p className="text-sm">
                        Enter a name above to find patient records
                    </p>
                </div>
            )}

            {debouncedSearch && isPending && (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Date of Birth</TableHead>
                                <TableHead>Gender</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {isError && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive opacity-60" />
                    <div>
                        <p className="font-medium text-destructive">
                            Failed to load patients
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {error?.message ?? "An unexpected error occurred"}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => refetch()}>
                        Try again
                    </Button>
                </div>
            )}

            {patients && patients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <p className="text-lg font-medium">No results</p>
                    <p className="text-sm">
                        No patients found for &ldquo;{debouncedSearch}&rdquo;
                    </p>
                </div>
            )}

            {patients && patients.length > 0 && (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Date of Birth</TableHead>
                                <TableHead>Gender</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {patients.map((patient) => (
                                <TableRow
                                    key={patient.id}
                                    className="cursor-pointer"
                                    tabIndex={0}
                                    role="link"
                                    aria-label={`Open ${patient.displayName} details`}
                                    onClick={() =>
                                        navigate(
                                            `/dashboard/patients/${patient.id}`,
                                        )
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            navigate(`/dashboard/patients/${patient.id}`)
                                        }
                                    }}
                                >
                                    <TableCell className="font-medium">
                                        {patient.displayName}
                                    </TableCell>
                                    <TableCell>
                                        {patient.birthDate ?? "Unknown"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                genderVariant[patient.gender] ??
                                                "outline"
                                            }
                                            className="capitalize"
                                        >
                                            {patient.gender}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
