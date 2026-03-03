import type { UserRole } from "@fhir-mern/shared";

export type AppRole = UserRole;

const ROLE_SET = new Set<AppRole>(["admin", "practitioner", "patient"]);

export function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return ROLE_SET.has(value as AppRole) ? (value as AppRole) : null;
}

export function getRoleHomePath(role: AppRole): string {
  if (role === "patient") return "/portal/health";
  return "/dashboard/patients";
}

function normalizePath(path: string): string {
  const trimmed = String(path || "").trim();
  if (!trimmed) return "/";
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "");
}

export function isPathAllowedForRole(role: AppRole, path: string): boolean {
  const normalized = normalizePath(path);
  if (role === "patient") {
    return normalized === "/portal" || normalized.startsWith("/portal/");
  }
  return normalized === "/dashboard" || normalized.startsWith("/dashboard/");
}

export function getSessionUserValue(
  session: unknown,
  key: "id" | "role" | "name",
): unknown {
  if (!session || typeof session !== "object") return undefined;
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== "object") return undefined;
  return (user as Record<string, unknown>)[key];
}
