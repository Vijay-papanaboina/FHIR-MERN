import { useEffect } from "react";
import { useResolvedRole } from "@/hooks/use-resolved-role";
import type { AlertItem } from "@/lib/alert.api";
import { useAlertsStore } from "@/store/alerts.store";

interface StreamAlertPayload {
  id?: string;
  patientFhirId?: string;
  observationId?: string;
  type?: string;
  message?: string;
  value?: unknown;
  unit?: string;
  severity?: "warning" | "critical";
  sentToUserIds?: string[];
  acknowledgedBy?: string[];
  recordDate?: string;
  createdAt?: string;
}

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

function toAlertItem(payload: StreamAlertPayload): AlertItem | null {
  const id = String(payload.id ?? "").trim();
  if (!id) return null;
  const parsedValue = Number(payload.value);

  return {
    _id: id,
    patientFhirId: String(payload.patientFhirId ?? ""),
    observationId: String(payload.observationId ?? ""),
    type: String(payload.type ?? "Unknown"),
    message: String(payload.message ?? ""),
    value: Number.isFinite(parsedValue) ? parsedValue : 0,
    unit: String(payload.unit ?? ""),
    severity: payload.severity === "critical" ? "critical" : "warning",
    sentToUserIds: Array.isArray(payload.sentToUserIds)
      ? payload.sentToUserIds
      : [],
    acknowledgedBy: Array.isArray(payload.acknowledgedBy)
      ? payload.acknowledgedBy
      : [],
    recordDate: String(payload.recordDate ?? ""),
    createdAt: String(payload.createdAt ?? new Date().toISOString()),
  };
}

export function useAlertsSse() {
  const { session, role, isPending } = useResolvedRole();
  const appendAlert = useAlertsStore((state) => state.appendAlert);
  const resetAlerts = useAlertsStore((state) => state.resetAlerts);

  useEffect(() => {
    if (isPending) return;

    if (!session || (role !== "admin" && role !== "practitioner")) {
      resetAlerts();
      return;
    }

    const stream = new EventSource(`${API_BASE}/api/alerts/stream`, {
      withCredentials: true,
    });

    const onAlert = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as StreamAlertPayload;
        const alert = toAlertItem(parsed);
        if (alert) appendAlert(alert);
      } catch {
        // Ignore malformed event payloads.
      }
    };

    const onError = (event: Event) => {
      console.error("[alerts-sse] stream error", event);
    };

    stream.addEventListener("alert", onAlert);
    stream.addEventListener("error", onError);

    return () => {
      stream.removeEventListener("alert", onAlert);
      stream.removeEventListener("error", onError);
      stream.close();
    };
  }, [appendAlert, isPending, resetAlerts, role, session]);
}
