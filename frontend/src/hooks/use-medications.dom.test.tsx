// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMedications } from "@/hooks/use-medications";

const medicationApiMocks = vi.hoisted(() => ({
  fetchPatientMedications: vi.fn(),
  fetchPatientMedicationById: vi.fn(),
  createPatientMedication: vi.fn(),
  updatePatientMedicationStatus: vi.fn(),
}));

vi.mock("@/lib/medication.api", () => medicationApiMocks);

describe("useMedications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches medication list and reuses cached data", async () => {
    medicationApiMocks.fetchPatientMedications.mockResolvedValue([
      {
        id: "med-1",
        drugName: "Metformin 500mg",
        rxNormCode: null,
        dosageInstructions: "Take one tablet by mouth",
        frequency: "Twice daily",
        prescriber: "Dr A",
        prescriberReference: "Practitioner/u1",
        startDate: "2026-03-01T00:00:00.000Z",
        status: "active",
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useMedications("patient-1"), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(medicationApiMocks.fetchPatientMedications).toHaveBeenCalledTimes(1);
    expect(first.result.current.data?.[0]?.id).toBe("med-1");

    first.unmount();

    const second = renderHook(() => useMedications("patient-1"), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(medicationApiMocks.fetchPatientMedications).toHaveBeenCalledTimes(1);
    expect(second.result.current.data?.[0]?.drugName).toBe("Metformin 500mg");
  });
});
