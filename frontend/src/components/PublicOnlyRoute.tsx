import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import { getRoleHomePath, isPathAllowedForRole } from "@/lib/roles";

/** Only allow paths that start with a single "/" and have no scheme */
function isValidReturnTo(path: string): boolean {
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
  );
}

/**
 * Wrapper for public-only routes (login, register).
 * Redirects to dashboard if the user is already authenticated.
 * Honors ?returnTo= param if present and valid.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, role, isPending } = useResolvedRole();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (session) {
    const params = new URLSearchParams(location.search);
    const returnTo = params.get("returnTo");
    const decodedReturnTo =
      returnTo && isValidReturnTo(decodeURIComponent(returnTo))
        ? decodeURIComponent(returnTo)
        : null;
    const target =
      decodedReturnTo && role && isPathAllowedForRole(role, decodedReturnTo)
        ? decodedReturnTo
        : role
          ? getRoleHomePath(role)
          : "/pending-role";
    return <Navigate to={target} replace />;
  }

  return children;
}
