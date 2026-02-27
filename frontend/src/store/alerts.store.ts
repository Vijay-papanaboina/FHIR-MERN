import { create } from "zustand";
import type { AlertItem } from "@/lib/alert.api";

interface AlertsState {
  alerts: AlertItem[];
  unreadCount: number;
  isPanelOpen: boolean;
  appendAlert: (alert: AlertItem) => void;
  mergeAlerts: (alerts: AlertItem[]) => void;
  setAlerts: (alerts: AlertItem[]) => void;
  markAllRead: () => void;
  setPanelOpen: (open: boolean) => void;
  resetAlerts: () => void;
}

function alertTimeValue(alert: AlertItem): number {
  const raw = alert.recordDate || alert.createdAt;
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function sortDescByTime(items: AlertItem[]): AlertItem[] {
  return [...items].sort((a, b) => alertTimeValue(b) - alertTimeValue(a));
}

function upsertById(base: AlertItem[], incoming: AlertItem): AlertItem[] {
  const existingIndex = base.findIndex((item) => item._id === incoming._id);
  if (existingIndex === -1) return sortDescByTime([incoming, ...base]);
  const next = [...base];
  next[existingIndex] = { ...next[existingIndex], ...incoming };
  return sortDescByTime(next);
}

export const useAlertsStore = create<AlertsState>()((set) => ({
  alerts: [],
  unreadCount: 0,
  isPanelOpen: false,
  appendAlert: (incoming) =>
    set((state) => {
      const alreadyExists = state.alerts.some(
        (item) => item._id === incoming._id,
      );
      return {
        alerts: upsertById(state.alerts, incoming),
        unreadCount:
          alreadyExists || state.isPanelOpen
            ? state.unreadCount
            : state.unreadCount + 1,
      };
    }),
  mergeAlerts: (incoming) =>
    set((state) => {
      let next = state.alerts;
      for (const alert of incoming) {
        next = upsertById(next, alert);
      }
      return { alerts: sortDescByTime(next) };
    }),
  setAlerts: (incoming) => set({ alerts: sortDescByTime(incoming) }),
  markAllRead: () => set({ unreadCount: 0 }),
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  resetAlerts: () => set({ alerts: [], unreadCount: 0, isPanelOpen: false }),
}));
