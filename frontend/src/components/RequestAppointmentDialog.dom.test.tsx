// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestAppointmentDialog } from "@/components/RequestAppointmentDialog";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

describe("RequestAppointmentDialog", () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockReset();
    if (!("scrollIntoView" in HTMLElement.prototype)) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: vi.fn(),
        writable: true,
      });
    }
  });

  async function selectCareTeamOption(label: string) {
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: label }));
  }

  it("blocks submission when end time is not after start", async () => {
    render(
      <RequestAppointmentDialog
        careTeamOptions={[
          { userId: "u-1", label: "Dr Primary (primary)", role: "primary" },
        ]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Request Appointment" }),
    );
    await selectCareTeamOption("Dr Primary (primary)");

    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "2099-03-01T10:30" },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: "2099-03-01T10:00" },
    });

    const submitButton = screen
      .getAllByRole("button", { name: "Request Appointment" })
      .at(-1) as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        "End time must be after start time",
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
