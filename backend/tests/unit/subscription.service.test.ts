import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  env: {
    BACKEND_WEBHOOK_URL: "http://localhost:3000",
    WEBHOOK_SECRET: "1234567890abcdef",
  },
}));

const fhirClientMocks = vi.hoisted(() => ({
  fhirBaseUrl: vi.fn(() => "http://localhost:8080/fhir"),
  fhirPut: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../src/config/env.js", () => envMock);
vi.mock("../../src/repositories/fhir.client.js", () => fhirClientMocks);
vi.mock("../../src/utils/logger.js", () => loggerMocks);

import { registerFhirSubscription } from "../../src/services/subscription.service.js";

describe("subscription.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.env.BACKEND_WEBHOOK_URL = "http://localhost:3000";
    envMock.env.WEBHOOK_SECRET = "1234567890abcdef";
  });

  it("skips registration when webhook url is missing", async () => {
    envMock.env.BACKEND_WEBHOOK_URL = undefined;

    await registerFhirSubscription();

    expect(fhirClientMocks.fhirPut).not.toHaveBeenCalled();
    expect(loggerMocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("BACKEND_WEBHOOK_URL not set"),
    );
  });

  it("registers subscription with webhook header when secret exists", async () => {
    fhirClientMocks.fhirPut.mockResolvedValue({});

    await registerFhirSubscription();

    expect(fhirClientMocks.fhirPut).toHaveBeenCalledTimes(1);
    const [url, payload] = fhirClientMocks.fhirPut.mock.calls[0]!;
    expect(String(url)).toMatch(/\/Subscription\/backend-observation-sub$/);
    expect(payload.channel.header).toEqual(["X-Webhook-Secret: 1234567890abcdef"]);
  });

  it("registers subscription without webhook header when secret is missing", async () => {
    envMock.env.WEBHOOK_SECRET = undefined;
    fhirClientMocks.fhirPut.mockResolvedValue({});

    await registerFhirSubscription();

    expect(fhirClientMocks.fhirPut).toHaveBeenCalledTimes(1);
    const [, payload] = fhirClientMocks.fhirPut.mock.calls[0]!;
    expect(payload.channel.header).toBeUndefined();
  });

  it("logs and swallows registration errors", async () => {
    fhirClientMocks.fhirPut.mockRejectedValue(new Error("boom"));

    await expect(registerFhirSubscription()).resolves.toBeUndefined();
    expect(loggerMocks.logger.error).toHaveBeenCalled();
  });
});
