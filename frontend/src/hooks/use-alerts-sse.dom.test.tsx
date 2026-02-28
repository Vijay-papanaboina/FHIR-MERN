// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAlertsStore } from "@/store/alerts.store";
import { useAlertsSse } from "@/hooks/use-alerts-sse";

let mockSession: unknown = { user: { id: "u1", role: "admin" } };
let mockRole: "admin" | "practitioner" | "patient" | null = "admin";
let mockPending = false;

vi.mock("@/hooks/use-resolved-role", () => ({
  useResolvedRole: () => ({
    session: mockSession,
    role: mockRole,
    isPending: mockPending,
  }),
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  close = vi.fn();
  url: string;
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: (event: MessageEvent) => void) {
    const current = this.listeners.get(type) ?? [];
    this.listeners.set(type, [...current, cb]);
  }
  removeEventListener(type: string, cb: (event: MessageEvent) => void) {
    const current = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      current.filter((item) => item !== cb),
    );
  }
  emit(type: string, data: unknown) {
    const payload = new MessageEvent("message", {
      data: JSON.stringify(data),
    });
    for (const cb of this.listeners.get(type) ?? []) cb(payload);
  }
}

Object.defineProperty(globalThis, "EventSource", {
  writable: true,
  value: MockEventSource,
});

function HookHarness() {
  useAlertsSse();
  return null;
}

describe("useAlertsSse", () => {
  beforeEach(() => {
    mockSession = { user: { id: "u1", role: "admin" } };
    mockRole = "admin";
    mockPending = false;
    MockEventSource.instances = [];
    useAlertsStore.getState().resetAlerts();
  });

  it("opens stream for admin/practitioner sessions", async () => {
    render(<HookHarness />);
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0]?.url).toContain("/api/alerts/stream");
  });

  it("does not open stream for patient role", async () => {
    mockRole = "patient";
    render(<HookHarness />);
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(0));
    expect(useAlertsStore.getState().alerts).toEqual([]);
  });

  it("appends incoming alert events to store", async () => {
    render(<HookHarness />);
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    MockEventSource.instances[0]?.emit("alert", {
      id: "a1",
      patientFhirId: "p1",
      type: "Heart rate",
      value: 130,
      unit: "bpm",
      severity: "critical",
      createdAt: "2026-02-01T00:00:00.000Z",
    });

    await waitFor(() =>
      expect(useAlertsStore.getState().alerts.map((a) => a._id)).toContain(
        "a1",
      ),
    );
  });
});
