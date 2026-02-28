import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

describe("api helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success data for GET/POST/PATCH/DELETE", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ status: "success", data: { ok: true } }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );

    await expect(apiGet<{ ok: boolean }>("/api/test")).resolves.toEqual({
      ok: true,
    });
    await expect(
      apiPost<{ ok: boolean }>("/api/test", { a: 1 }),
    ).resolves.toEqual({
      ok: true,
    });
    await expect(
      apiPatch<{ ok: boolean }>("/api/test", { a: 2 }),
    ).resolves.toEqual({
      ok: true,
    });
    await expect(apiDelete<{ ok: boolean }>("/api/test")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("throws ApiError for jsend fail and error responses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "fail", data: { message: "bad request" } }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "error", message: "server boom" }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        ),
      );

    await expect(apiGet("/api/fail")).rejects.toMatchObject({
      name: "ApiError",
      status: "fail",
      statusCode: 400,
      message: "bad request",
    });

    await expect(apiGet("/api/error")).rejects.toMatchObject({
      name: "ApiError",
      status: "error",
      statusCode: 500,
      message: "server boom",
    });
  });

  it("throws ApiError for non-json payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("plain text", {
        status: 502,
        headers: { "content-type": "text/plain" },
      }),
    );

    await expect(apiGet("/api/non-json")).rejects.toMatchObject({
      status: "error",
      statusCode: 502,
    });
  });

  it("normalizes abort/timeout network errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("aborted", "AbortError"),
    );

    await expect(apiGet("/api/timeout")).rejects.toMatchObject({
      status: "error",
      message: "Request timed out",
    });
  });
});
