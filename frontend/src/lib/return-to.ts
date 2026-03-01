export function isSafeReturnPath(path: string): boolean {
  const value = String(path ?? "").trim();
  return (
    value.startsWith("/") && !value.startsWith("//") && !value.includes("://")
  );
}

export function sanitizeReturnTo(rawValue: string | null): string {
  if (!rawValue) return "/";
  try {
    const decoded = decodeURIComponent(rawValue).trim();
    return isSafeReturnPath(decoded) ? decoded : "/";
  } catch {
    return "/";
  }
}
