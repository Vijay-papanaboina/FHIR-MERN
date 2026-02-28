import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import type { PatientDTO } from "@fhir-mern/shared";

import { GENDER_VARIANT } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { useAssignedPatients, usePatients } from "@/hooks/use-patients";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortOption = "name-asc" | "name-desc" | "dob-asc" | "dob-desc";
type GenderFilter = "all" | "male" | "female" | "other" | "unknown";

function sortPatients(
  patients: PatientDTO[],
  sortBy: SortOption,
): PatientDTO[] {
  const next = [...patients];
  if (sortBy === "name-asc") {
    return next.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  if (sortBy === "name-desc") {
    return next.sort((a, b) => b.displayName.localeCompare(a.displayName));
  }
  if (sortBy === "dob-asc") {
    return next.sort((a, b) =>
      (a.birthDate ?? "9999-99-99").localeCompare(b.birthDate ?? "9999-99-99"),
    );
  }
  return next.sort((a, b) =>
    (b.birthDate ?? "0000-00-00").localeCompare(a.birthDate ?? "0000-00-00"),
  );
}

export function PatientListPage() {
  const navigate = useNavigate();
  const { role } = useResolvedRole();
  const isPractitioner = role === "practitioner";
  const isAdmin = role === "admin";

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const assignedPatientsQuery = useAssignedPatients(isPractitioner);
  const adminPatientsQuery = usePatients(debouncedSearch, isAdmin);

  const patients = isPractitioner
    ? assignedPatientsQuery.data
    : adminPatientsQuery.data;
  const isPending = isPractitioner
    ? assignedPatientsQuery.isPending
    : adminPatientsQuery.isPending;
  const isError = isPractitioner
    ? assignedPatientsQuery.isError
    : adminPatientsQuery.isError;
  const error = isPractitioner
    ? assignedPatientsQuery.error
    : adminPatientsQuery.error;
  const refetch = isPractitioner
    ? assignedPatientsQuery.refetch
    : adminPatientsQuery.refetch;

  const displayPatients = useMemo(() => {
    let next = patients ?? [];

    if (isPractitioner && search.trim()) {
      const term = search.trim().toLowerCase();
      next = next.filter((p) => p.displayName.toLowerCase().includes(term));
    }

    if (genderFilter !== "all") {
      next = next.filter((p) => p.gender === genderFilter);
    }

    return sortPatients(next, sortBy);
  }, [genderFilter, isPractitioner, patients, search, sortBy]);

  const showAdminPrompt = isAdmin && !debouncedSearch;

  const title = isPractitioner ? "Assigned Patients" : "Patients";
  const subtitle = isPractitioner
    ? "View and filter your assigned patients"
    : "Search and manage patient records";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={genderFilter}
            onValueChange={(value: string) =>
              setGenderFilter(value as GenderFilter)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value: string) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="dob-desc">DOB newest</SelectItem>
              <SelectItem value="dob-asc">DOB oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showAdminPrompt && (
        <EmptyState
          icon={Search}
          title="Search for patients"
          subtitle="Enter a name above to find patient records"
        />
      )}

      {!showAdminPrompt && isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name </TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Gender</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
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

      {!showAdminPrompt && patients && displayPatients.length === 0 && (
        <EmptyState
          title="No results"
          subtitle={
            isPractitioner
              ? "No assigned patients match the current filters"
              : `No patients found for \u201c${debouncedSearch}\u201d`
          }
        />
      )}

      {!showAdminPrompt && patients && displayPatients.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name </TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Gender</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPatients.map((patient) => (
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
