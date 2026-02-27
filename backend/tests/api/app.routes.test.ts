import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("App base routes", () => {
  const app = createApp();

  it("returns welcome payload on GET /", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body?.status).toBe("success");
    expect(res.body?.data?.message).toBe("Hello from FHIR Backend!");
  });

  it("returns standardized 404 for unknown routes", async () => {
    const res = await request(app).get("/definitely-not-a-real-route");

    expect(res.status).toBe(404);
    expect(res.body?.status).toBe("fail");
    expect(String(res.body?.data?.message ?? "")).toMatch(/Route not found/i);
  });
});
