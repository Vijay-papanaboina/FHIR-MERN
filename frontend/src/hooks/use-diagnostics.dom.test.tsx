// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDiagnostics } from "@/hooks/use-diagnostics";

const diagnosticApiMocks = vi.hoisted(() => ({
  fetchPatientDiagnostics: vi.fn(),
  fetchPatientDiagnosticResults: vi.fn(),
}));

vi.mock("@/lib/diagnostic.api", () => diagnosticApiMocks);

describe("useDiagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches diagnostics list and reuses cached data", async () => {
    diagnosticApiMocks.fetchPatientDiagnostics.mockResolvedValue([
      {
        id: "diag-1",
        status: "final",
        category: "Laboratory",
        code: "CBC",
        issued: "2026-03-02T00:00:00.000Z",
        effectiveDateTime: "2026-03-02T00:00:00.000Z",
        performer: "Lab A",
        conclusion: null,
        resultObservationIds: ["obs-1"],
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useDiagnostics("patient-1"), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(diagnosticApiMocks.fetchPatientDiagnostics).toHaveBeenCalledTimes(1);
    expect(first.result.current.data?.[0]?.id).toBe("diag-1");

    first.unmount();

    const second = renderHook(() => useDiagnostics("patient-1"), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(diagnosticApiMocks.fetchPatientDiagnostics).toHaveBeenCalledTimes(1);
    expect(second.result.current.data?.[0]?.code).toBe("CBC");
  });
});
