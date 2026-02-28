import { apiGet, apiPost } from "@/lib/api";

export type AlertSeverity = "warning" | "critical";

export interface AlertItem {
  _id: string;
  patientFhirId: string;
  observationId: string;
  type: string;
  message: string;
  value: number;
  unit: string;
  severity: AlertSeverity;
  sentToUserIds: string[];
  acknowledgedBy: string[];
  recordDate: string;
  createdAt: string;
}

export interface AlertListResponse {
  items: AlertItem[];
  total: number;
  page: number;
  limit: number;
  unacknowledgedCount?: number;
}

export interface AlertSummaryResponse {
  unacknowledgedCount: number;
  windowHours: number;
}

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
