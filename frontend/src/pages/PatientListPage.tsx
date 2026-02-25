import { useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";

import { GENDER_VARIANT } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { usePatients } from "@/hooks/use-patients";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PatientListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const {
    data: patients,
    isPending,
    isError,
    error,
    refetch,
  } = usePatients(debouncedSearch);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"> Patients </h1>
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
        <EmptyState
          icon={Search}
          title="Search for patients"
          subtitle="Enter a name above to find patient records"
        />
      )}

      {debouncedSearch && isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name </TableHead>
                <TableHead> Date of Birth </TableHead>
                <TableHead> Gender </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />{" "}
                  </TableCell>
                  <TableCell>
                    {" "}
                    <Skeleton className="h-4 w-24" />{" "}
                  </TableCell>
                  <TableCell>
                    {" "}
                    <Skeleton className="h-5 w-16" />{" "}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load patients"}
          onRetry={refetch}
        />
      )}

      {patients && patients.length === 0 && (
        <EmptyState
          title="No results"
          subtitle={`No patients found for \u201c${debouncedSearch}\u201d`}
        />
      )}

      {patients && patients.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name </TableHead>
                <TableHead> Date of Birth </TableHead>
                <TableHead> Gender </TableHead>
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
                  onClick={() => navigate(`/dashboard/patients/${patient.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/dashboard/patients/${patient.id}`);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    {patient.displayName}
                  </TableCell>
                  <TableCell>{patient.birthDate ?? "Unknown"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={GENDER_VARIANT[patient.gender] ?? "outline"}
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
  );
}
