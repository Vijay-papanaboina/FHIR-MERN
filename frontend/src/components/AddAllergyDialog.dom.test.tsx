// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddAllergyDialog } from "@/components/AddAllergyDialog";

describe("AddAllergyDialog", () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockReset();
  });

  it("keeps submit disabled until required fields are filled", async () => {
    render(<AddAllergyDialog onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Allergy" }));

    const substance = await screen.findByLabelText("Substance");
    const submitButton = screen.getByRole("button", { name: "Save Allergy" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(substance, { target: { value: "Penicillin" } });
    expect(submitButton).toBeEnabled();
  });

  it("submits a valid payload", async () => {
    onSubmit.mockResolvedValue(undefined);
    render(<AddAllergyDialog onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Allergy" }));

    fireEvent.change(await screen.findByLabelText("Substance"), {
      target: { value: "Peanuts" },
    });
    fireEvent.change(screen.getByLabelText("SNOMED code (optional)"), {
      target: { value: "91935009" },
    });
    fireEvent.change(screen.getByLabelText("Recorded date"), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText("Reaction (optional)"), {
      target: { value: "Hives" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Allergy" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        substance: "Peanuts",
        snomedCode: "91935009",
        recordedDate: "2026-03-01",
        reaction: "Hives",
      }),
    );
  });
});
