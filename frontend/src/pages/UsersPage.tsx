import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { UserRole } from "@/lib/user.api";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useLinkUserPatient,
  useUpdateUserRole,
  useUsers,
} from "@/hooks/use-users";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const PAGE_SIZE = 25;

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [draftRoleByUserId, setDraftRoleByUserId] = useState<
    Record<string, UserRole>
  >({});
  const [draftFhirByUserId, setDraftFhirByUserId] = useState<
    Record<string, string>
  >({});

  const debouncedSearch = useDebounce(search.trim(), 300);
  const { data, isPending, isError, error, refetch } = useUsers({
    q: debouncedSearch,
    page,
    limit: PAGE_SIZE,
    enabled: true,
  });
  const updateRole = useUpdateUserRole();
  const linkPatient = useLinkUserPatient();

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onSaveRole = async (userId: string, currentRole: UserRole) => {
    const role = draftRoleByUserId[userId] ?? currentRole;
    if (role === currentRole) return;
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success("Role updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      );
    }
  };

  const onLinkPatient = async (userId: string) => {
    const fhirPatientId = (draftFhirByUserId[userId] ?? "").trim();
    if (!fhirPatientId) {
      toast.error("Enter a FHIR Patient ID");
      return;
    }
    try {
      await linkPatient.mutateAsync({ userId, fhirPatientId });
      toast.success("Patient linked");
      setDraftFhirByUserId((prev) => ({ ...prev, [userId]: "" }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to link patient",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage roles and patient links.</p>
      </div>

      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
        />
      </div>

      {isPending && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>FHIR Patient ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-40" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load users"}
          onRetry={refetch}
        />
      )}

      {!isPending && !isError && (data?.items.length ?? 0) === 0 && (
        <EmptyState
          title="No users found"
          subtitle="Try adjusting your search."
        />
      )}

      {!isPending && !isError && (data?.items.length ?? 0) > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>FHIR Patient ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((user) => {
                const isUnlinkedPatient =
                  user.role === "patient" && !user.fhirPatientId;
                const draftRole = draftRoleByUserId[user._id] ?? user.role;
                const draftFhir = draftFhirByUserId[user._id] ?? "";
                return (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={draftRole}
                          onValueChange={(value: string) =>
                            setDraftRoleByUserId((prev) => ({
                              ...prev,
                              [user._id]: value as UserRole,
                            }))
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="patient">Patient</SelectItem>
                            <SelectItem value="practitioner">
                              Practitioner
                            </SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSaveRole(user._id, user.role)}
                          disabled={updateRole.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {user.fhirPatientId ? (
                          <Badge variant="outline">{user.fhirPatientId}</Badge>
                        ) : (
                          <Badge
                            variant={
                              isUnlinkedPatient ? "destructive" : "secondary"
                            }
                          >
                            {isUnlinkedPatient
                              ? "Unlinked patient"
                              : "Not linked"}
                          </Badge>
                        )}
                        {draftRole === "patient" && (
                          <div className="flex gap-2">
                            <Input
                              value={draftFhir}
                              onChange={(e) =>
                                setDraftFhirByUserId((prev) => ({
                                  ...prev,
                                  [user._id]: e.target.value,
                                }))
                              }
                              placeholder="FHIR Patient ID"
                            />
                            <Button
                              size="sm"
                              onClick={() => onLinkPatient(user._id)}
                              disabled={linkPatient.isPending}
                            >
                              Link
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {(updateRole.isPending || linkPatient.isPending) && (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!isPending && !isError && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
