// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PatientDiagnosticsTab } from "@/components/PatientDiagnosticsTab";

const diagnosticsHookMocks = vi.hoisted(() => ({
  useDiagnosticResults: vi.fn(),
}));

vi.mock("@/hooks/use-diagnostics", () => diagnosticsHookMocks);

describe("PatientDiagnosticsTab", () => {
  const onRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    diagnosticsHookMocks.useDiagnosticResults.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("shows diagnostics error state when loading fails with no data", () => {
    render(
      <PatientDiagnosticsTab
        patientId="patient-1"
        diagnostics={undefined}
        diagnosticsLoading={false}
        diagnosticsError
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Failed to load diagnostics")).toBeInTheDocument();
  });

  it("renders diagnostics table and expandable results", () => {
    diagnosticsHookMocks.useDiagnosticResults.mockReturnValue({
      data: [
        {
          id: "obs-1",
          status: "final",
          code: "Hemoglobin",
          value: "13.2 g/dL",
          interpretation: "Normal",
          recordedAt: "2026-03-02T00:00:00.000Z",
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <PatientDiagnosticsTab
        patientId="patient-1"
        diagnostics={[
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
        ]}
        diagnosticsLoading={false}
        diagnosticsError={false}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("CBC")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View results" }));

    expect(diagnosticsHookMocks.useDiagnosticResults).toHaveBeenLastCalledWith(
      "patient-1",
      "diag-1",
      true,
    );
    expect(screen.getByText("Hemoglobin")).toBeInTheDocument();
  });
});
