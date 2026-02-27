import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { apiGet } from "@/lib/api";
import { normalizeRole, type AppRole, getSessionUserValue } from "@/lib/roles";

interface AuthMeUser {
  role?: unknown;
}

export function useResolvedRole() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const sessionRole = useMemo(
    () => normalizeRole(getSessionUserValue(session, "role")),
    [session],
  );
  const sessionUserId = useMemo(() => {
    const raw = getSessionUserValue(session, "id");
    return typeof raw === "string" ? raw : null;
  }, [session]);

  const [fallbackRolesByUserId, setFallbackRolesByUserId] = useState<
    Record<string, AppRole | null>
  >({});
  const fallbackRole =
    sessionUserId && Object.hasOwn(fallbackRolesByUserId, sessionUserId)
      ? fallbackRolesByUserId[sessionUserId]
      : undefined;

  useEffect(() => {
    if (!session || sessionRole || !sessionUserId || fallbackRole !== undefined)
      return;

    let cancelled = false;
    (async () => {
      try {
        const me = await apiGet<AuthMeUser>("/api/auth/me");
        if (!cancelled) {
          setFallbackRolesByUserId((prev) => ({
            ...prev,
            [sessionUserId]: normalizeRole(me.role),
          }));
        }
      } catch {
        if (!cancelled) {
          setFallbackRolesByUserId((prev) => ({
            ...prev,
            [sessionUserId]: null,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fallbackRole, session, sessionRole, sessionUserId]);

  const role = sessionRole ?? (fallbackRole ?? null);
  const isResolvingRole = !!session && !sessionRole && fallbackRole === undefined;

  return {
    session,
    role,
    isPending: isSessionPending || isResolvingRole,
  };
}
