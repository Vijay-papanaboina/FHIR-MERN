import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { Account, Session, User } from "../../src/models/auth.model.js";

export const TEST_ORIGIN = "http://localhost:5173";

export interface TestIdentity {
  email: string;
  password: string;
  name: string;
  agent: request.SuperAgentTest;
  userId: string;
}

export const signUp = async (
  app: Express,
  email: string,
  password: string,
  name: string,
) => {
  const res = await request(app)
    .post("/api/auth/sign-up/email")
    .set("Origin", TEST_ORIGIN)
    .set("Referer", `${TEST_ORIGIN}/`)
    .send({ email, password, name });
  return res;
};

export const signIn = async (
  agent: request.SuperAgentTest,
  email: string,
  password: string,
) => {
  const res = await agent
    .post("/api/auth/sign-in/email")
    .set("Origin", TEST_ORIGIN)
    .set("Referer", `${TEST_ORIGIN}/`)
    .send({ email, password });
  return res;
};

export const createIdentity = async (
  app: Express,
  prefix: string,
  role?: "patient" | "practitioner" | "admin",
): Promise<TestIdentity> => {
  const suffix = randomUUID();
  const email = `${prefix}.${suffix}@example.com`;
  const password = "Password123!";
  const name = `${prefix}-${suffix}`;
  const agent = request.agent(app);

  const signUpRes = await signUp(app, email, password, name);
  if (signUpRes.status !== 200) {
    throw new Error(`Sign-up failed (${signUpRes.status}) for ${email}`);
  }

  if (role) {
    const roleUpdateResult = await User.updateOne({ email }, { $set: { role } });
    if (roleUpdateResult.matchedCount < 1) {
      throw new Error(`Unable to match user for role update: ${email}`);
    }
  }

  const user = await User.findOne({ email });
  if (!user?._id) {
    throw new Error(`Unable to resolve created user id for ${email}`);
  }

  const signInRes = await signIn(agent, email, password);
  if (signInRes.status !== 200) {
    throw new Error(`Sign-in failed (${signInRes.status}) for ${email}`);
  }

  return { email, password, name, agent, userId: String(user._id) };
};

export const cleanupUsersByEmail = async (emails: string[]) => {
  if (emails.length === 0) return;

  const users = await User.find({ email: { $in: emails } }, { _id: 1 }).lean();
  const userIds = users.map((u) => u._id);
  if (userIds.length === 0) return;

  await Promise.all([
    Session.deleteMany({ userId: { $in: userIds } }),
    Account.deleteMany({ userId: { $in: userIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);
};
