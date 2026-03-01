import { apiGet, apiPost } from "@/lib/api";
import type {
  AlertItem,
  AlertListResponse,
  AlertSummaryResponse,
} from "@fhir-mern/shared";
export type {
  AlertItem,
  AlertListResponse,
  AlertSeverity,
  AlertSummaryResponse,
} from "@fhir-mern/shared";

export function fetchAlerts(
  page = 1,
  limit = 50,
  options?: { unacknowledged?: boolean },
): Promise<AlertListResponse> {
  const rawPage = Number(page);
  const rawLimit = Number(limit);
  const normalizedPage = Math.max(
    1,
    Math.trunc(Number.isFinite(rawPage) ? rawPage : 0),
  );
  const normalizedLimit = Math.max(
    1,
    Math.min(100, Math.trunc(Number.isFinite(rawLimit) ? rawLimit : 0)),
  );
  const query = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  });
  if (options?.unacknowledged) query.set("unacknowledged", "true");
  return apiGet<AlertListResponse>(`/api/alerts?${query.toString()}`);
}

export function acknowledgeAlert(alertId: string): Promise<AlertItem> {
  const trimmed = alertId.trim();
  if (!trimmed) return Promise.reject(new Error("Alert ID is required"));
  return apiPost<AlertItem>(
    `/api/alerts/${encodeURIComponent(trimmed)}/acknowledge`,
  );
}

export function fetchAlertSummary(hours = 24): Promise<AlertSummaryResponse> {
  const normalizedHours = Math.max(
    1,
    Math.min(
      168,
      Math.trunc(Number.isFinite(Number(hours)) ? Number(hours) : 24),
    ),
  );
  return apiGet<AlertSummaryResponse>(
    `/api/alerts/summary?hours=${normalizedHours}`,
  );
}
