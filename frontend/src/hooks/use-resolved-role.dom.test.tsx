// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResolvedRole } from "@/hooks/use-resolved-role";

let mockSession: unknown = null;
let mockSessionPending = false;
const apiGetMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: mockSession,
      isPending: mockSessionPending,
    }),
  },
}));

vi.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
}));

function HookHarness({
  onValue,
}: {
  onValue: (value: ReturnType<typeof useResolvedRole>) => void;
}) {
  onValue(useResolvedRole());
  return null;
}

describe("useResolvedRole", () => {
  beforeEach(() => {
    mockSession = null;
    mockSessionPending = false;
    apiGetMock.mockReset();
  });

  it("uses session role directly when available", async () => {
    mockSession = { user: { id: "u1", role: "admin" } };
    const values: ReturnType<typeof useResolvedRole>[] = [];

    render(<HookHarness onValue={(v) => values.push(v)} />);

    await waitFor(() => expect(values.at(-1)?.role).toBe("admin"));
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("falls back to /api/auth/me when session exists without role", async () => {
    mockSession = { user: { id: "u1" } };
    apiGetMock.mockResolvedValue({ role: "practitioner" });
    const values: ReturnType<typeof useResolvedRole>[] = [];

    render(<HookHarness onValue={(v) => values.push(v)} />);

    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith("/api/auth/me"),
    );
    await waitFor(() => expect(values.at(-1)?.role).toBe("practitioner"));
  });

  it("returns null role when fallback request fails", async () => {
    mockSession = { user: { id: "u1" } };
    apiGetMock.mockRejectedValue(new Error("network"));
    const values: ReturnType<typeof useResolvedRole>[] = [];

    render(<HookHarness onValue={(v) => values.push(v)} />);

    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith("/api/auth/me"),
    );
    await waitFor(() => expect(values.at(-1)?.role).toBeNull());
  });
});
