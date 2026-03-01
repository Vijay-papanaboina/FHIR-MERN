// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrescribeMedicationDialog } from "@/components/PrescribeMedicationDialog";

const medicationHookMocks = vi.hoisted(() => ({
  useCreateMedication: vi.fn(),
}));

vi.mock("@/hooks/use-medications", () => medicationHookMocks);

describe("PrescribeMedicationDialog", () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockReset();
    medicationHookMocks.useCreateMedication.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
  });

  it("keeps submit disabled until required fields are filled", async () => {
    render(<PrescribeMedicationDialog patientId="patient-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Prescribe" }));

    const drugName = await screen.findByLabelText("Drug Name");
    const dosage = screen.getByLabelText("Dosage Instructions");
    const frequency = screen.getByLabelText("Frequency");
    const startDate = screen.getByLabelText("Start Date");

    const submitButton = screen
      .getAllByRole("button", { name: "Prescribe" })
      .at(-1) as HTMLButtonElement;
    expect(submitButton).toBeDisabled();

    fireEvent.change(drugName, { target: { value: "Metformin 500mg" } });
    fireEvent.change(dosage, { target: { value: "Take one tablet by mouth" } });
    fireEvent.change(frequency, { target: { value: "Twice daily" } });
    fireEvent.change(startDate, { target: { value: "2026-03-01" } });

    expect(submitButton).toBeEnabled();
  });

  it("submits valid payload", async () => {
    mutateAsync.mockResolvedValue({ id: "med-1" });
    render(<PrescribeMedicationDialog patientId="patient-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Prescribe" }));

    fireEvent.change(await screen.findByLabelText("Drug Name"), {
      target: { value: "Lisinopril 10mg" },
    });
    fireEvent.change(screen.getByLabelText("RxNorm Code (optional)"), {
      target: { value: "12345" },
    });
    fireEvent.change(screen.getByLabelText("Dosage Instructions"), {
      target: { value: "Take one tablet by mouth" },
    });
    fireEvent.change(screen.getByLabelText("Frequency"), {
      target: { value: "Daily" },
    });
    fireEvent.change(screen.getByLabelText("Start Date"), {
      target: { value: "2026-03-01" },
    });

    const submitButton = screen
      .getAllByRole("button", { name: "Prescribe" })
      .at(-1) as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        drugName: "Lisinopril 10mg",
        rxNormCode: "12345",
        dosageInstructions: "Take one tablet by mouth",
        frequency: "Daily",
        startDate: "2026-03-01",
      }),
    );
  });
});
