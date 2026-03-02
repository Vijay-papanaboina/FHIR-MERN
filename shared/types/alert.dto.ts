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
