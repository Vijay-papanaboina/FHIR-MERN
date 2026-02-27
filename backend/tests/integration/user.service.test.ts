import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongo } from "../../src/config/db.js";
import { User } from "../../src/models/auth.model.js";
import { AppError } from "../../src/utils/AppError.js";
import {
  changeUserRole,
  linkPatientToUser,
  listSafeUsers,
} from "../../src/services/user.service.js";

describe("user service", () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await User.deleteMany({
      email: /service\.(patient|link|search|regex)\..*@example\.com/,
    });
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
    expect((error as AppError).message).toMatch(
      /Invalid FHIR Patient ID format/,
    );
  });

  it("listSafeUsers returns paginated safe payload", async () => {
    const now = Date.now();
    await User.create([
      {
        _id: randomUUID(),
        name: "Service Search A",
        email: `service.search.a.${now}@example.com`,
        emailVerified: true,
        role: "patient",
        fhirPatientId: null,
      },
      {
        _id: randomUUID(),
        name: "Service Search B",
        email: `service.search.b.${now}@example.com`,
        emailVerified: true,
        role: "practitioner",
        fhirPatientId: null,
      },
    ]);

    const out = await listSafeUsers({
      q: `service.search.a.${now}`,
      page: 1,
      limit: 25,
    });

    expect(out.page).toBe(1);
    expect(out.limit).toBe(25);
    expect(out.total).toBeGreaterThanOrEqual(1);
    expect(out.items.length).toBeGreaterThanOrEqual(1);
    expect(out.items[0]).toHaveProperty("_id");
    expect(out.items[0]).toHaveProperty("name");
    expect(out.items[0]).toHaveProperty("email");
    expect(out.items[0]).toHaveProperty("role");
    expect(out.items[0]).toHaveProperty("fhirPatientId");
  });

  it("listSafeUsers treats regex metacharacters in q as plain text", async () => {
    const now = Date.now();
    const literalName = `Service Regex A.*B ${now}`;
    const broadMatchName = `Service Regex AxxB ${now}`;

    await User.create([
      {
        _id: randomUUID(),
        name: literalName,
        email: `service.regex.literal.${now}@example.com`,
        emailVerified: true,
        role: "patient",
        fhirPatientId: null,
      },
      {
        _id: randomUUID(),
        name: broadMatchName,
        email: `service.regex.broad.${now}@example.com`,
        emailVerified: true,
        role: "patient",
        fhirPatientId: null,
      },
    ]);

    const out = await listSafeUsers({
      q: `A.*B ${now}`,
      page: 1,
      limit: 25,
    });

    const names = out.items.map((i) => i.name);
    expect(names).toContain(literalName);
    expect(names).not.toContain(broadMatchName);
  });
});
