import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import { fetchPatient } from "@/lib/patient.api";
import {
  useAssignments,
  useCreateAssignment,
  useDeactivateAssignment,
  usePractitioners,
} from "@/hooks/use-assignments";
import { usePatients } from "@/hooks/use-patients";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssignmentRole } from "@fhir-mern/shared";

export function AssignmentsPage() {
  const [patientSearch, setPatientSearch] = useState("");
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPractitionerId, setSelectedPractitionerId] = useState("");
  const [assignmentRole, setAssignmentRole] =
    useState<AssignmentRole>("primary");

  const debouncedPatientSearch = useDebounce(patientSearch.trim(), 300);
  const debouncedPractitionerSearch = useDebounce(
    practitionerSearch.trim(),
    200,
  );

  const {
    data: assignments,
    isPending: assignmentsLoading,
    isError: assignmentsError,
    error: assignmentsErrorObj,
    refetch: refetchAssignments,
  } = useAssignments(true);
  const { data: patients } = usePatients(debouncedPatientSearch, true);
  const { data: practitioners } = usePractitioners(true);

  const createAssignment = useCreateAssignment();
  const deactivateAssignment = useDeactivateAssignment();

  const filteredPractitioners = useMemo(() => {
    const q = debouncedPractitionerSearch.toLowerCase();
    if (!q) return practitioners ?? [];
    return (practitioners ?? []).filter((p) =>
      `${p.name} ${p.email}`.toLowerCase().includes(q),
    );
  }, [debouncedPractitionerSearch, practitioners]);

  const practitionerById = useMemo(
    () => new Map((practitioners ?? []).map((p) => [p._id, p.name] as const)),
    [practitioners],
  );

  const searchedPatientById = useMemo(
    () => new Map((patients ?? []).map((p) => [p.id, p.displayName] as const)),
    [patients],
  );
  const assignmentPatientIds = useMemo(
    () =>
      Array.from(
        new Set(
          (assignments ?? []).map((assignment) => assignment.patientFhirId),
        ),
      ),
    [assignments],
  );
  const assignmentPatientQueries = useQueries({
    queries: assignmentPatientIds.map((patientId) => ({
      queryKey: ["patient", patientId],
      queryFn: () => fetchPatient(patientId),
      staleTime: 5 * 60_000,
      retry: 1,
      enabled: !assignmentsLoading && !assignmentsError,
    })),
  });
  const assignmentPatientById = useMemo(() => {
    const byId = new Map<string, string>();
    assignmentPatientIds.forEach((patientId, index) => {
      const patient = assignmentPatientQueries[index]?.data;
      if (patient?.displayName) byId.set(patientId, patient.displayName);
    });
    return byId;
  }, [assignmentPatientIds, assignmentPatientQueries]);

  const onCreate = async () => {
    if (!selectedPatientId || !selectedPractitionerId) {
      toast.error("Select patient and practitioner first");
      return;
    }
    try {
      await createAssignment.mutateAsync({
        patientFhirId: selectedPatientId,
        assignedUserId: selectedPractitionerId,
        assignmentRole,
      });
      toast.success("Assignment created");
      setSelectedPatientId("");
      setSelectedPractitionerId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      toast.error(message);
    }
  };

  const onDeactivate = async (assignmentId: string) => {
    try {
      await deactivateAssignment.mutateAsync(assignmentId);
      toast.success("Assignment deactivated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Deactivate failed";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">
          Manage active patient-practitioner assignments.
        </p>
      </div>

      <div className="rounded-md border p-4">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <p className="font-medium">New Assignment</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Patient search</Label>
            <Input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient by name..."
            />
            <Select
              value={selectedPatientId}
              onValueChange={setSelectedPatientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {(patients ?? []).map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Practitioner search</Label>
            <Input
              value={practitionerSearch}
              onChange={(e) => setPractitionerSearch(e.target.value)}
              placeholder="Filter practitioners..."
            />
            <Select
              value={selectedPractitionerId}
              onValueChange={setSelectedPractitionerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select practitioner" />
              </SelectTrigger>
              <SelectContent>
                {filteredPractitioners.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignment role</Label>
            <Select
              value={assignmentRole}
              onValueChange={(v: string) =>
                setAssignmentRole(v as AssignmentRole)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="covering">Covering</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={onCreate}
              className="w-full"
              disabled={createAssignment.isPending}
            >
              {createAssignment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Assignment
            </Button>
          </div>
        </div>
      </div>

      {assignmentsLoading && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Practitioner</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned At</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {assignmentsError && (
        <ErrorState
          message={assignmentsErrorObj?.message ?? "Failed to load assignments"}
          onRetry={refetchAssignments}
        />
      )}

      {!assignmentsLoading &&
        !assignmentsError &&
        (assignments?.length ?? 0) === 0 && (
          <EmptyState
            title="No active assignments"
            subtitle="Create an assignment to start linking practitioners to patients."
          />
        )}

      {!assignmentsLoading &&
        !assignmentsError &&
        (assignments?.length ?? 0) > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Practitioner</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assignments ?? []).map((assignment) => (
                  <TableRow key={assignment._id}>
                    <TableCell className="font-medium">
                      {assignmentPatientById.get(assignment.patientFhirId) ??
                        searchedPatientById.get(assignment.patientFhirId) ??
                        assignment.patientFhirId}
                    </TableCell>
                    <TableCell>
                      {practitionerById.get(assignment.assignedUserId) ??
                        assignment.assignedUserId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {assignment.assignmentRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.assignedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deactivateAssignment.isPending}
                        onClick={() => onDeactivate(assignment._id)}
                      >
                        Deactivate
                      </Button>
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
