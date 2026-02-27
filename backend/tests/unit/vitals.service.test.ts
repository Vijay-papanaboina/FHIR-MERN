import { beforeEach, describe, expect, it, vi } from "vitest";

const observationRepoMocks = vi.hoisted(() => ({
  getVitalsByPatientId: vi.fn(),
  createVital: vi.fn(),
}));

const vitalsMapperMocks = vi.hoisted(() => ({
  toBundleOfVitalsDTOs: vi.fn(),
  toVitalsDTO: vi.fn(),
}));

vi.mock("../../src/repositories/observation.repository.js", () => observationRepoMocks);
vi.mock("../../src/services/vitals.mapper.js", () => vitalsMapperMocks);

import {
  createPatientReportedVital,
  createPatientVital,
  getPatientVitals,
} from "../../src/services/vitals.service.js";

describe("vitals.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getPatientVitals maps bundle results", async () => {
    const bundle = { entry: [] };
    const mapped = [{ id: "obs-1" }];
    observationRepoMocks.getVitalsByPatientId.mockResolvedValue(bundle);
    vitalsMapperMocks.toBundleOfVitalsDTOs.mockReturnValue(mapped);

    const out = await getPatientVitals("p1");

    expect(observationRepoMocks.getVitalsByPatientId).toHaveBeenCalledWith("p1");
    expect(vitalsMapperMocks.toBundleOfVitalsDTOs).toHaveBeenCalledWith(bundle);
    expect(out).toEqual(mapped);
  });

  it("createPatientVital builds observation and maps created resource", async () => {
    const created = { id: "obs-created", source: "fhir" };
    const mapped = { id: "dto-created" };
    observationRepoMocks.createVital.mockResolvedValue(created);
    vitalsMapperMocks.toVitalsDTO.mockReturnValue(mapped);

    const out = await createPatientVital("p1", {
      code: "8867-4",
      display: "Heart rate",
      value: 70,
      unit: "beats/minute",
      unitCode: "/min",
    });

    const createdArg = observationRepoMocks.createVital.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(createdArg.subject).toEqual({ reference: "Patient/p1" });
    expect(createdArg.performer).toBeUndefined();
    expect(createdArg.code).toEqual({
      coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }],
      text: "Heart rate",
    });
    expect(vitalsMapperMocks.toVitalsDTO).toHaveBeenCalledWith(created);
    expect(out).toEqual(mapped);
  });

  it("createPatientReportedVital sets performer reference to patient", async () => {
    const created = { id: "obs-r", source: "fhir" };
    const mapped = { id: "obs-r" };
    observationRepoMocks.createVital.mockResolvedValue(created);
    vitalsMapperMocks.toVitalsDTO.mockReturnValue(mapped);

    const result = await createPatientReportedVital("p2", {
      code: "8310-5",
      display: "Body temperature",
      value: 36.9,
      unit: "C",
      unitCode: "Cel",
    });

    const createdArg = observationRepoMocks.createVital.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(createdArg.performer).toEqual([{ reference: "Patient/p2" }]);
    expect(vitalsMapperMocks.toVitalsDTO).toHaveBeenCalledWith(created);
    expect(result).toEqual(mapped);
  });
});
