import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { initAuth } from "../../src/config/auth.js";
import { connectMongo } from "../../src/config/db.js";
import { createApp } from "../../src/app.js";
import {
  cleanupUsersByEmail,
  signIn,
  signUp,
  TEST_ORIGIN,
} from "./test-helpers.js";

describe("Auth routes", () => {
  const app = createApp();
  const agent = request.agent(app);
  const createdEmails: string[] = [];

  beforeAll(async () => {
    await connectMongo();
    initAuth();
  });

  afterAll(async () => {
    await cleanupUsersByEmail(createdEmails);
    await mongoose.disconnect();
  });

  it("returns 401 for /api/auth/me without authentication", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("supports sign-up, sign-in, me, and sign-out flow", async () => {
    const email = `auth.test.${randomUUID()}@example.com`;
    const password = "Password123!";
    createdEmails.push(email);

    const signUpRes = await signUp(app, email, password, "Auth Test User");
    expect(signUpRes.status).toBe(200);

    const signInRes = await signIn(agent, email, password);
    expect(signInRes.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body?.status).toBe("success");
    expect(me.body?.data?.email).toBe(email);
    expect(me.body?.data?.role).toBe("patient");

    const signOut = await agent
      .post("/api/auth/sign-out")
      .set("Origin", TEST_ORIGIN)
      .set("Referer", `${TEST_ORIGIN}/`)
      .send({});

    expect(signOut.status).toBe(200);

    const meAfterSignOut = await agent.get("/api/auth/me");
    expect(meAfterSignOut.status).toBe(401);
  });

  it("routes unknown /api/auth paths through better-auth catch-all", async () => {
    const res = await request(app).get("/api/auth/not-a-real-endpoint");

    expect(res.status).toBe(404);
    expect(res.body?.status).not.toBe("fail");
    expect(String(res.body?.data?.message ?? "")).not.toMatch(/Route not found/i);
  });
});
