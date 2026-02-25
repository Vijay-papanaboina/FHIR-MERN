import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Extract up to 2 uppercase initials from a display name */
export function getInitials(name: string | null | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) return "?"
  return trimmed
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
