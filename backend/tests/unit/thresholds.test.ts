import { describe, expect, it } from "vitest";
import { evaluateObservation } from "../../src/services/thresholds.js";

const baseObservation = {
  resourceType: "Observation",
  id: "obs-1",
  subject: { reference: "Patient/p1" },
  effectiveDateTime: "2026-02-27T00:00:00.000Z",
};

describe("thresholds.evaluateObservation", () => {
  it("returns critical alert for severe heart rate breach", () => {
    const out = evaluateObservation({
      ...baseObservation,
      code: { coding: [{ system: "http://loinc.org", code: "8867-4" }] },
      valueQuantity: { value: 150 },
    });

    expect(out?.severity).toBe("critical");
    expect(out?.type).toBe("CRITICAL_HIGH_HEART_RATE");
    expect(out?.patientFhirId).toBe("p1");
  });

  it("returns warning alert for moderate breach", () => {
    const out = evaluateObservation({
      ...baseObservation,
      code: { coding: [{ system: "http://loinc.org", code: "8310-5" }] },
      valueQuantity: { value: 38.5 },
    });

    expect(out?.severity).toBe("warning");
    expect(out?.type).toBe("WARNING_HIGH_BODY_TEMPERATURE");
    expect(out?.patientFhirId).toBe("p1");
  });

  it("returns null for unknown code", () => {
    expect(
      evaluateObservation({
        ...baseObservation,
        code: { coding: [{ system: "http://loinc.org", code: "unknown" }] },
        valueQuantity: { value: 10 },
      }),
    ).toBeNull();
  });

  it("returns null for missing value", () => {
    expect(
      evaluateObservation({
        ...baseObservation,
        code: { coding: [{ system: "http://loinc.org", code: "8867-4" }] },
      }),
    ).toBeNull();
  });

  it("returns null for missing patient id", () => {
    expect(
      evaluateObservation({
        ...baseObservation,
        subject: { reference: "Practitioner/x1" },
        code: { coding: [{ system: "http://loinc.org", code: "8867-4" }] },
        valueQuantity: { value: 150 },
      }),
    ).toBeNull();
  });
});
