// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddConditionDialog } from "@/components/AddConditionDialog";

describe("AddConditionDialog", () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockReset();
  });

  it("keeps submit disabled until required fields are filled", async () => {
    render(<AddConditionDialog onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Condition" }));

    const diagnosis = await screen.findByLabelText("Diagnosis");
    const submitButton = screen.getByRole("button", { name: "Save Condition" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(diagnosis, {
      target: { value: "Essential hypertension" },
    });

    expect(submitButton).toBeEnabled();
  });

  it("submits a valid payload", async () => {
    onSubmit.mockResolvedValue(undefined);
    render(<AddConditionDialog onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Condition" }));

    fireEvent.change(await screen.findByLabelText("Diagnosis"), {
      target: { value: "Type 2 diabetes mellitus" },
    });
    fireEvent.change(screen.getByLabelText("SNOMED code (optional)"), {
      target: { value: "44054006" },
    });
    fireEvent.change(screen.getByLabelText("Recorded date"), {
      target: { value: "2026-03-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Condition" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        diagnosis: "Type 2 diabetes mellitus",
        snomedCode: "44054006",
        recordedDate: "2026-03-01",
      }),
    );
  });
});
