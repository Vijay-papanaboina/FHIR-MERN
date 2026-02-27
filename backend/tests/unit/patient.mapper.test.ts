import { describe, expect, it } from "vitest";
import {
  toBundleOfPatientDTOs,
  toPatientDTO,
} from "../../src/services/patient.mapper.js";

describe("patient.mapper", () => {
  it("maps a valid Patient resource to DTO", () => {
    const dto = toPatientDTO({
      resourceType: "Patient",
      id: "p1",
      name: [{ use: "official", given: ["John"], family: "Doe" }],
      gender: "male",
      birthDate: "1990-01-01",
    });

    expect(dto).toEqual({
      id: "p1",
      displayName: "John Doe",
      birthDate: "1990-01-01",
      gender: "male",
    });
  });

  it("falls back to unknown name and gender", () => {
    const dto = toPatientDTO({
      resourceType: "Patient",
      id: "p2",
      name: [],
      gender: "invalid",
    });

    expect(dto.displayName).toBe("Unknown");
    expect(dto.gender).toBe("unknown");
    expect(dto.birthDate).toBeNull();
  });

  it("throws for non-patient resources or missing id", () => {
    expect(() => toPatientDTO({ resourceType: "Observation", id: "o1" })).toThrow(
      /Expected Patient resource/,
    );
    expect(() => toPatientDTO({ resourceType: "Patient" })).toThrow(
      /missing an id/,
    );
  });

  it("maps bundles and filters invalid entries", () => {
    const out = toBundleOfPatientDTOs({
      entry: [
        { resource: { resourceType: "Patient", id: "p1", name: [{ text: "A" }] } },
        { resource: { resourceType: "Patient", id: "" } },
        { resource: { resourceType: "Observation", id: "o1" } },
        {},
      ],
    });

    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("p1");
    expect(out[0]?.displayName).toBe("A");
  });

  it("throws when Patient id is empty string", () => {
    expect(() =>
      toPatientDTO({
        resourceType: "Patient",
        id: "",
      }),
    ).toThrow(/missing an id/);
  });
});
