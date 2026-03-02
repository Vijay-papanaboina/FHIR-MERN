// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePortalAppointments } from "@/hooks/use-appointments";

const appointmentApiMocks = vi.hoisted(() => ({
  fetchPatientAppointments: vi.fn(),
  createPatientAppointment: vi.fn(),
  decidePatientAppointment: vi.fn(),
  fetchPortalAppointments: vi.fn(),
  createPortalAppointment: vi.fn(),
  cancelPortalAppointment: vi.fn(),
}));

vi.mock("@/lib/appointment.api", () => appointmentApiMocks);

describe("usePortalAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches portal appointments and reuses cached data", async () => {
    appointmentApiMocks.fetchPortalAppointments.mockResolvedValue([
      {
        id: "appt-1",
        status: "pending",
        lifecycleStatus: "requested",
        start: "2099-03-01T10:00:00.000Z",
        end: "2099-03-01T10:30:00.000Z",
        reason: "Follow-up",
        note: null,
        cancellationReason: null,
        patientReference: "Patient/patient-1",
        patientParticipantStatus: "accepted",
        practitionerReference: "Practitioner/u-1",
        practitionerParticipantStatus: "needs-action",
        practitionerDisplay: "Dr Primary",
        careTeamUserId: "u-1",
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => usePortalAppointments(true), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(appointmentApiMocks.fetchPortalAppointments).toHaveBeenCalledTimes(
      1,
    );
    expect(first.result.current.data?.[0]?.id).toBe("appt-1");

    first.unmount();

    const second = renderHook(() => usePortalAppointments(true), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(appointmentApiMocks.fetchPortalAppointments).toHaveBeenCalledTimes(
      1,
    );
    expect(second.result.current.data?.[0]?.lifecycleStatus).toBe("requested");
  });
});
