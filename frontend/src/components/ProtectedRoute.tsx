import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import {
  getRoleHomePath,
  isPathAllowedForRole,
  type AppRole,
} from "@/lib/roles";
import { isSafeReturnPath } from "@/lib/return-to";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { session, role, isPending } = useResolvedRole();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    const raw = location.pathname + location.search;
    const returnTo = isSafeReturnPath(raw)
      ? encodeURIComponent(raw)
      : encodeURIComponent("/");
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  if (!role) {
    return (
      <Navigate
        to="/pending-role"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  if (!isPathAllowedForRole(role, location.pathname)) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  return children;
}
