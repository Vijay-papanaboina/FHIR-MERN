import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";

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
  const { data: session, isPending } = authClient.useSession();
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
    const target =
      returnTo && isValidReturnTo(decodeURIComponent(returnTo))
        ? decodeURIComponent(returnTo)
        : "/dashboard/patients";
    return <Navigate to={target} replace />;
  }

  return children;
}
