import { beforeEach, describe, expect, it } from "vitest";
import { useAlertsStore } from "@/store/alerts.store";
import type { AlertItem } from "@/lib/alert.api";

function makeAlert(id: string, createdAt: string): AlertItem {
  return {
    _id: id,
    patientFhirId: "p1",
    observationId: `obs-${id}`,
    type: "Heart rate",
    message: "High heart rate",
    value: 120,
    unit: "bpm",
    severity: "warning",
    sentToUserIds: ["u1"],
    acknowledgedBy: [],
    recordDate: createdAt,
    createdAt,
  };
}

describe("alerts store", () => {
  beforeEach(() => {
    useAlertsStore.getState().resetAlerts();
  });

  it("increments unread only for new unique alerts", () => {
    const store = useAlertsStore.getState();
    store.appendAlert(makeAlert("a1", "2026-01-01T00:00:00.000Z"));
    store.appendAlert(makeAlert("a1", "2026-01-01T00:00:00.000Z"));

    const out = useAlertsStore.getState();
    expect(out.alerts).toHaveLength(1);
    expect(out.unreadCount).toBe(1);
  });

  it("supports setting unread count from backend summary", () => {
    const store = useAlertsStore.getState();
    store.setUnreadCount(7);

    const out = useAlertsStore.getState();
    expect(out.unreadCount).toBe(7);
  });

  it("merges and sorts alerts by newest time", () => {
    const store = useAlertsStore.getState();
    store.appendAlert(makeAlert("old", "2026-01-01T00:00:00.000Z"));
    store.mergeAlerts([makeAlert("new", "2026-01-02T00:00:00.000Z")]);

    const out = useAlertsStore.getState();
    expect(out.alerts.map((a) => a._id)).toEqual(["new", "old"]);
  });

  it("marks all as read and resets state", () => {
    const store = useAlertsStore.getState();
    store.appendAlert(makeAlert("a1", "2026-01-01T00:00:00.000Z"));
    store.markAllRead();

    expect(useAlertsStore.getState().unreadCount).toBe(0);

    store.resetAlerts();
    const out = useAlertsStore.getState();
    expect(out.alerts).toEqual([]);
    expect(out.unreadCount).toBe(0);
    expect(out.isPanelOpen).toBe(false);
  });
});
