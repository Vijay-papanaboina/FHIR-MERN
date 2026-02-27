import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { initAuth } from "../../src/config/auth.js";
import { connectMongo } from "../../src/config/db.js";
import { env } from "../../src/config/env.js";
import { createApp } from "../../src/app.js";
import { Alert } from "../../src/models/alert.model.js";
import { Assignment } from "../../src/models/assignment.model.js";
import { User } from "../../src/models/auth.model.js";
import { cleanupUsersByEmail, TEST_ORIGIN } from "./test-helpers.js";

const getCookieHeader = (setCookieHeader: string[] | undefined): string => {
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error("No set-cookie headers found");
  }
  return setCookieHeader.map((c) => c.split(";")[0]!).join("; ");
};

describe("Alert SSE stream", () => {
  const app = createApp();
  const createdEmails: string[] = [];

  let baseUrl = "";
  let patientFhirId = "";
  let observationId = "";
  let server: ReturnType<typeof app.listen>;
  let streamController: AbortController | null = null;

  beforeAll(async () => {
    await connectMongo();
    initAuth();

    server = app.listen(0);
    await new Promise<void>((resolve) => server.on("listening", () => resolve()));

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to resolve test server address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    streamController?.abort();

    if (patientFhirId) {
      await Assignment.deleteMany({ patientFhirId });
    }
    if (observationId) {
      await Alert.deleteMany({ observationId });
    }
    await cleanupUsersByEmail(createdEmails);
    if ("closeAllConnections" in server) {
      server.closeAllConnections();
    }
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it("streams alert event to assigned practitioner", async () => {
    const suffix = `${Date.now()}`;
    const adminEmail = `sse.admin.${suffix}@example.com`;
    const practitionerEmail = `sse.pract.${suffix}@example.com`;
    createdEmails.push(adminEmail, practitionerEmail);
    patientFhirId = `sse-patient-${suffix}`;
    observationId = `sse-obs-${suffix}`;

    for (const [email, name] of [
      [adminEmail, "SSE Admin"],
      [practitionerEmail, "SSE Practitioner"],
    ]) {
      const signUpRes = await request(app)
        .post("/api/auth/sign-up/email")
        .set("Origin", TEST_ORIGIN)
        .set("Referer", `${TEST_ORIGIN}/`)
        .send({ email, password: "Password123!", name });
      expect(signUpRes.status).toBe(200);
    }

    await Promise.all([
      User.updateOne({ email: adminEmail }, { $set: { role: "admin" } }),
      User.updateOne(
        { email: practitionerEmail },
        { $set: { role: "practitioner" } },
      ),
    ]);

    const adminSignIn = await request(app)
      .post("/api/auth/sign-in/email")
      .set("Origin", TEST_ORIGIN)
      .set("Referer", `${TEST_ORIGIN}/`)
      .send({ email: adminEmail, password: "Password123!" });
    expect(adminSignIn.status).toBe(200);
    const adminCookie = getCookieHeader(adminSignIn.headers["set-cookie"]);

    const practitionerSignIn = await request(app)
      .post("/api/auth/sign-in/email")
      .set("Origin", TEST_ORIGIN)
      .set("Referer", `${TEST_ORIGIN}/`)
      .send({ email: practitionerEmail, password: "Password123!" });
    expect(practitionerSignIn.status).toBe(200);
    const practitionerCookie = getCookieHeader(
      practitionerSignIn.headers["set-cookie"],
    );

    const practitionerMe = await request(app)
      .get("/api/auth/me")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", practitionerCookie);
    expect(practitionerMe.status).toBe(200);
    const practitionerUserId = practitionerMe.body?.data?.id as string;
    expect(practitionerUserId).toBeTruthy();

    const assignRes = await request(app)
      .post("/api/assignments")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", adminCookie)
      .send({
        patientFhirId,
        assignedUserId: practitionerUserId,
        assignmentRole: "primary",
      });
    expect(assignRes.status).toBe(201);

    streamController = new AbortController();
    const streamResponse = await fetch(`${baseUrl}/api/alerts/stream`, {
      headers: {
        Cookie: practitionerCookie,
        Accept: "text/event-stream",
      },
      signal: streamController.signal,
    });
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.body).toBeTruthy();

    const readAlertEvent = (async () => {
      const reader = streamResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        let value: Uint8Array | undefined;
        let done = false;
        try {
          ({ value, done } = await reader.read());
        } catch (error) {
          const name =
            error instanceof Error
              ? error.name
              : typeof error === "object" &&
                  error &&
                  "name" in error &&
                  typeof (error as { name?: unknown }).name === "string"
                ? String((error as { name?: unknown }).name)
                : "";
          if (name === "AbortError") {
            return buffer;
          }
          throw error;
        }
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.includes("event: alert")) {
          return buffer;
        }
      }
      return buffer;
    })();

    const webhookReq = request(app)
      .post("/api/alerts/webhook")
      .send({
        resourceType: "Observation",
        id: observationId,
        code: {
          coding: [{ system: "http://loinc.org", code: "8867-4" }],
        },
        valueQuantity: { value: 150 },
        subject: { reference: `Patient/${patientFhirId}` },
        effectiveDateTime: new Date().toISOString(),
      });

    if (env.WEBHOOK_SECRET) {
      webhookReq.set("x-webhook-secret", env.WEBHOOK_SECRET);
    }

    const webhookRes = await webhookReq;
    expect(webhookRes.status).toBe(200);

    const streamPayload = await Promise.race([
      readAlertEvent,
      new Promise<string>((_, reject) => {
        setTimeout(() => {
          streamController?.abort();
          reject(new Error("Timed out waiting for SSE alert"));
        }, 8000);
      }),
    ]);

    expect(streamPayload).toContain("event: alert");
    expect(streamPayload).toContain(patientFhirId);
    expect(streamPayload).toContain("CRITICAL_HIGH_HEART_RATE");
    streamController.abort();
  });
});
