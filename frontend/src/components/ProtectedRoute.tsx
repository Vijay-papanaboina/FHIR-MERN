import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";

/** Only allow paths that start with a single "/" and have no scheme */
function isValidReturnTo(path: string): boolean {
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
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
    const returnTo = isValidReturnTo(raw)
      ? encodeURIComponent(raw)
      : encodeURIComponent("/");
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return children;
}
