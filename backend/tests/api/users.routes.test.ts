import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initAuth } from "../../src/config/auth.js";
import { connectMongo } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import {
  cleanupUsersByEmail,
  createIdentity,
  type TestIdentity,
} from "./test-helpers.js";

describe("User routes", () => {
  let app: ReturnType<typeof createApp>;
  const createdEmails: string[] = [];

  let adminUserId = "";
  let normalUserId = "";
  let admin!: TestIdentity;
  let normal!: TestIdentity;

  beforeAll(async () => {
    await connectMongo();
    initAuth();
    app = createApp();

    admin = await createIdentity(app, "users.admin", "admin");
    normal = await createIdentity(app, "users.normal", "patient");
    createdEmails.push(admin.email, normal.email);

    adminUserId = admin.userId;
    normalUserId = normal.userId;
  });

  afterAll(async () => {
    await cleanupUsersByEmail(createdEmails);
    await mongoose.disconnect();
  });

  it("blocks non-admin from role updates", async () => {
    const res = await normal.agent
      .patch(`/api/users/${normalUserId}/role`)
      .send({ role: "practitioner" });

    expect(res.status).toBe(403);
  });

  it("blocks non-admin from listing users", async () => {
    const res = await normal.agent.get("/api/users");
    expect(res.status).toBe(403);
  });

  it("lists users for admin with pagination", async () => {
    const res = await admin.agent.get("/api/users?page=1&limit=25");
    expect(res.status).toBe(200);
    expect(res.body?.status).toBe("success");
    expect(Array.isArray(res.body?.data?.items)).toBe(true);
    expect(res.body?.data?.page).toBe(1);
    expect(res.body?.data?.limit).toBe(25);
    expect(typeof res.body?.data?.total).toBe("number");
    expect(
      res.body.data.items.some((u: { _id: string }) => u._id === adminUserId),
    ).toBe(true);
  });

  it("applies q search on admin users list", async () => {
    const token = normal.email.split("@")[0];
    const res = await admin.agent.get(
      `/api/users?q=${encodeURIComponent(token)}`,
    );

    expect(res.status).toBe(200);
    expect(res.body?.status).toBe("success");
    expect(Array.isArray(res.body?.data?.items)).toBe(true);
    expect(
      res.body.data.items.some((u: { _id: string }) => u._id === normalUserId),
    ).toBe(true);
  });

  it("allows admin role update and returns safe payload", async () => {
    const res = await admin.agent
      .patch(`/api/users/${normalUserId}/role`)
      .send({ role: "practitioner" });

    expect(res.status).toBe(200);
    expect(res.body?.status).toBe("success");
    expect(res.body?.data?.role).toBe("practitioner");
    expect(res.body?.data?.email).toBeTruthy();
    expect(res.body?.data?.fhirPatientId).toBeNull();
  });

  it("returns 400 for malformed fhirPatientId on link endpoint", async () => {
    const res = await admin.agent
      .patch(`/api/users/${normalUserId}/link-patient`)
      .send({ fhirPatientId: "bad id !" });

    expect(res.status).toBe(400);
  });

  it("returns 403 when linking non-patient target user", async () => {
    const ensureRole = await admin.agent
      .patch(`/api/users/${normalUserId}/role`)
      .send({ role: "practitioner" });
    expect(ensureRole.status).toBe(200);

    const res = await admin.agent
      .patch(`/api/users/${normalUserId}/link-patient`)
      .send({ fhirPatientId: "1001" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown target user", async () => {
    const res = await admin.agent
      .patch(`/api/users/${randomUUID()}/role`)
      .send({ role: "patient" });

    expect(res.status).toBe(404);
  });

  it("keeps admin identity accessible for sanity", async () => {
    const me = await admin.agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body?.data?.id).toBe(adminUserId);
    expect(me.body?.data?.role).toBe("admin");
  });
});
