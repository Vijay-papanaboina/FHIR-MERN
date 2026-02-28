import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import { getRoleHomePath, type AppRole } from "@/lib/roles";

interface DashboardRoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

export function DashboardRoleGuard({
  allowedRoles,
  children,
}: DashboardRoleGuardProps) {
  const { session, role, isPending } = useResolvedRole();

  if (isPending) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  return children;
}
