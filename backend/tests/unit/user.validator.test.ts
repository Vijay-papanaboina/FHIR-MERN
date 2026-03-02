import { describe, expect, it } from "vitest";
import {
  linkPractitionerSchema,
  linkPatientSchema,
  updateUserRoleSchema,
} from "../../src/validators/user.validator.js";

describe("user validators", () => {
  it("linkPatientSchema accepts valid fhirPatientId", () => {
    const parsed = linkPatientSchema.safeParse({
      fhirPatientId: "Patient-1001",
    });
    expect(parsed.success).toBe(true);
  });

  it("linkPatientSchema rejects malformed fhirPatientId", () => {
    const parsed = linkPatientSchema.safeParse({ fhirPatientId: "bad id !" });
    expect(parsed.success).toBe(false);
  });

  it("linkPatientSchema rejects empty and whitespace-only fhirPatientId", () => {
    expect(linkPatientSchema.safeParse({ fhirPatientId: "" }).success).toBe(
      false,
    );
    expect(linkPatientSchema.safeParse({ fhirPatientId: "   " }).success).toBe(
      false,
    );
  });

  it("linkPatientSchema rejects missing fhirPatientId field", () => {
    expect(linkPatientSchema.safeParse({}).success).toBe(false);
  });

  it("linkPatientSchema rejects overly long and injection-like input", () => {
    const tooLong = "a".repeat(65);
    expect(
      linkPatientSchema.safeParse({ fhirPatientId: tooLong }).success,
    ).toBe(false);
    expect(
      linkPatientSchema.safeParse({ fhirPatientId: '"; DROP TABLE--' }).success,
    ).toBe(false);
  });

  it("linkPractitionerSchema accepts valid fhirPractitionerId", () => {
    const parsed = linkPractitionerSchema.safeParse({
      fhirPractitionerId: "Practitioner-1001",
    });
    expect(parsed.success).toBe(true);
  });

  it("linkPractitionerSchema rejects malformed fhirPractitionerId", () => {
    const parsed = linkPractitionerSchema.safeParse({
      fhirPractitionerId: "bad id !",
    });
    expect(parsed.success).toBe(false);
  });

  it.each(["patient", "practitioner", "admin"] as const)(
    "updateUserRoleSchema accepts %s",
    (role) => {
      const parsed = updateUserRoleSchema.safeParse({ role });
      expect(parsed.success).toBe(true);
    },
  );

  it("updateUserRoleSchema rejects unknown role", () => {
    const parsed = updateUserRoleSchema.safeParse({ role: "owner" });
    expect(parsed.success).toBe(false);
  });
});
