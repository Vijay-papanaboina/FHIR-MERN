/** Reusable date/time formatters */

export function formatDate(iso: string | null): string {
    if (!iso) return "Unknown"
    // Date-only strings (e.g. "2024-01-15") are parsed as UTC by spec,
    // which can shift the displayed day in negative-offset timezones.
    // Appending T00:00:00 forces local-time parsing.
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso
    const d = new Date(normalized)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export function formatDateTime(iso: string | null): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}
