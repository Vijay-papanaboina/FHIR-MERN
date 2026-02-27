import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  searchPatientsByName: vi.fn(),
  getPatientById: vi.fn(),
}));

const mapperMocks = vi.hoisted(() => ({
  toBundleOfPatientDTOs: vi.fn(),
  toPatientDTO: vi.fn(),
}));

vi.mock("../../src/repositories/patient.repository.js", () => repoMocks);
vi.mock("../../src/services/patient.mapper.js", () => mapperMocks);

import { getPatient, searchPatients } from "../../src/services/patient.service.js";

describe("patient.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchPatients delegates repository -> mapper", async () => {
    const bundle = { entry: [] };
    const mapped = [{ id: "p1" }];
    repoMocks.searchPatientsByName.mockResolvedValue(bundle);
    mapperMocks.toBundleOfPatientDTOs.mockReturnValue(mapped);

    const out = await searchPatients("john");

    expect(repoMocks.searchPatientsByName).toHaveBeenCalledWith("john");
    expect(mapperMocks.toBundleOfPatientDTOs).toHaveBeenCalledWith(bundle);
    expect(out).toEqual(mapped);
  });

  it("getPatient delegates repository -> mapper", async () => {
    const patient = { resourceType: "Patient", id: "p1" };
    const mapped = { id: "p1", displayName: "John" };
    repoMocks.getPatientById.mockResolvedValue(patient);
    mapperMocks.toPatientDTO.mockReturnValue(mapped);

    const out = await getPatient("p1");

    expect(repoMocks.getPatientById).toHaveBeenCalledWith("p1");
    expect(mapperMocks.toPatientDTO).toHaveBeenCalledWith(patient);
    expect(out).toEqual(mapped);
  });

  it("searchPatients propagates repository errors", async () => {
    repoMocks.searchPatientsByName.mockRejectedValue(new Error("repo failed"));

    await expect(searchPatients("john")).rejects.toThrow(/repo failed/);
    expect(mapperMocks.toBundleOfPatientDTOs).not.toHaveBeenCalled();
  });

  it("getPatient propagates repository errors", async () => {
    repoMocks.getPatientById.mockRejectedValue(new Error("repo failed"));

    await expect(getPatient("p1")).rejects.toThrow(/repo failed/);
    expect(mapperMocks.toPatientDTO).not.toHaveBeenCalled();
  });
});
