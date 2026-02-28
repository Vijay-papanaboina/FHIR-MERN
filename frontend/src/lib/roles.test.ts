import { describe, expect, it } from "vitest";
import {
  getRoleHomePath,
  isPathAllowedForRole,
  normalizeRole,
} from "@/lib/roles";

describe("roles utilities", () => {
  it("normalizes valid roles", () => {
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("practitioner")).toBe("practitioner");
    expect(normalizeRole("patient")).toBe("patient");
  });

  it("rejects invalid role values", () => {
    expect(normalizeRole("root")).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });

  it("returns role home paths", () => {
    expect(getRoleHomePath("patient")).toBe("/portal/health");
    expect(getRoleHomePath("admin")).toBe("/dashboard/patients");
    expect(getRoleHomePath("practitioner")).toBe("/dashboard/patients");
  });

  it("allows intended portal/dashboard paths and rejects prefix traps", () => {
    expect(isPathAllowedForRole("patient", "/portal")).toBe(true);
    expect(isPathAllowedForRole("patient", "/portal/health")).toBe(true);
    expect(isPathAllowedForRole("patient", "/portal/health/")).toBe(true);
    expect(isPathAllowedForRole("patient", "/portalx")).toBe(false);

    expect(isPathAllowedForRole("admin", "/dashboard")).toBe(true);
    expect(isPathAllowedForRole("admin", "/dashboard/patients")).toBe(true);
    expect(isPathAllowedForRole("admin", "/dashboardx")).toBe(false);
  });
});
