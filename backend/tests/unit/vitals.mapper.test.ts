import { describe, expect, it } from "vitest";
import {
  toBundleOfVitalsDTOs,
  toVitalsDTO,
} from "../../src/services/vitals.mapper.js";

describe("vitals.mapper", () => {
  it("maps Observation to VitalsDTO", () => {
    const dto = toVitalsDTO({
      resourceType: "Observation",
      id: "obs-1",
      code: {
        text: "Heart rate",
        coding: [{ code: "8867-4", display: "Heart rate" }],
      },
      valueQuantity: { value: 72, unit: "beats/minute" },
      effectiveDateTime: "2026-01-01T00:00:00.000Z",
    });

    expect(dto).toEqual({
      id: "obs-1",
      code: "8867-4",
      type: "Heart rate",
      value: 72,
      unit: "beats/minute",
      recordedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("throws for bad resource type or missing id", () => {
    expect(() => toVitalsDTO({ resourceType: "Patient", id: "p1" })).toThrow(
      /Expected Observation resource/,
    );
    expect(() => toVitalsDTO({ resourceType: "Observation" })).toThrow(
      /missing an id/,
    );
  });

  it("handles missing valueQuantity by mapping value/unit to null", () => {
    const dto = toVitalsDTO({
      resourceType: "Observation",
      id: "obs-2",
      code: { text: "Heart rate", coding: [{ code: "8867-4" }] },
      effectiveDateTime: "2026-01-01T00:00:00.000Z",
    });
    expect(dto.value).toBeNull();
    expect(dto.unit).toBeNull();
    expect(dto.id).toBe("obs-2");
  });

  it("handles missing effectiveDateTime by mapping recordedAt to null", () => {
    const dto = toVitalsDTO({
      resourceType: "Observation",
      id: "obs-3",
      code: { text: "Heart rate", coding: [{ code: "8867-4" }] },
      valueQuantity: { value: 88, unit: "beats/minute" },
    });
    expect(dto.recordedAt).toBeNull();
  });

  it("handles missing coding safely", () => {
    const dto = toVitalsDTO({
      resourceType: "Observation",
      id: "obs-4",
      code: {},
      valueQuantity: { value: 80, unit: "beats/minute" },
    });
    expect(dto.code).toBeNull();
    expect(dto.type).toBe("Unknown");
  });

  it("maps bundle entries and skips invalid resources", () => {
    const out = toBundleOfVitalsDTOs({
      entry: [
        { resource: { resourceType: "Observation", id: "obs-1" } },
        { resource: { resourceType: "Observation", id: "" } },
        { resource: { resourceType: "Patient", id: "p1" } },
      ],
    });

    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("obs-1");
  });

  it("returns empty array for empty bundle", () => {
    expect(toBundleOfVitalsDTOs({ entry: [] })).toEqual([]);
    expect(toBundleOfVitalsDTOs({})).toEqual([]);
  });

  it("returns empty array for bundle with only invalid entries", () => {
    const out = toBundleOfVitalsDTOs({
      entry: [
        { resource: { resourceType: "Patient", id: "p1" } },
        { resource: { resourceType: "Observation", id: "" } },
        {},
      ],
    });
    expect(out).toEqual([]);
  });
});
