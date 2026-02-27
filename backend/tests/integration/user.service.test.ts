import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongo } from "../../src/config/db.js";
import { User } from "../../src/models/auth.model.js";
import { AppError } from "../../src/utils/AppError.js";
import { changeUserRole, linkPatientToUser } from "../../src/services/user.service.js";

describe("user service", () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /service\.(patient|link)\..*@example\.com/ });
    await mongoose.disconnect();
  });

  it("changeUserRole clears fhirPatientId when leaving patient role", async () => {
    const userId = randomUUID();
    await User.create({
      _id: userId,
      name: "Service Test Patient",
      email: `service.patient.${Date.now()}@example.com`,
      emailVerified: true,
      role: "patient",
      fhirPatientId: "1001",
    });

    const updated = await changeUserRole(userId, "practitioner", "seed-admin");
    expect(updated.role).toBe("practitioner");
    expect(updated.fhirPatientId).toBeNull();
  });

  it("linkPatientToUser rejects malformed fhirPatientId", async () => {
    expect.assertions(3);
    const userId = randomUUID();
    await User.create({
      _id: userId,
      name: "Service Link Test Patient",
      email: `service.link.${Date.now()}@example.com`,
      emailVerified: true,
      role: "patient",
      fhirPatientId: null,
    });

    let error: unknown;
    try {
      await linkPatientToUser(userId, "bad id !");
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(400);
    expect((error as AppError).message).toMatch(/Invalid FHIR Patient ID format/);
  });
});
