import type { JSendResponse } from "@fhir-mern/shared";

/**
 * Thin wrapper around fetch for our backend API calls.
 * - Prepends the backend base URL.
 * - Sets credentials: "include" so the Better-Auth session cookie is sent.
 * - Parses JSend responses and throws on "fail" / "error" status.
 */

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 15_000;

export type { JSendError, JSendFail, JSendSuccess } from "@fhir-mern/shared";

/**
 * Custom error class for API failures.
 * Carries the original JSend status ("fail" or "error") and message.
 */
export class ApiError extends Error {
  status: "fail" | "error";
  statusCode?: number;

  constructor(message: string, status: "fail" | "error", statusCode?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Wrap fetch to catch timeout/abort errors and normalize to ApiError.
 */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "AbortError" || err.name === "TimeoutError")
    ) {
      throw new ApiError("Request timed out", "error");
    }
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
      "error",
    );
  }
}

/**
 * Parse a JSend response. Guards against non-JSON content types and malformed JSON.
 */
async function parseJSend<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    throw new ApiError(
      text || `Unexpected response (HTTP ${res.status})`,
      "error",
      res.status,
    );
  }

  let json: JSendResponse<T, { message: string }>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Invalid JSON body", "error", res.status);
  }

  if (json.status === "success") return json.data;
  if (json.status === "fail")
    throw new ApiError(json.data.message, "fail", res.status);
  throw new ApiError(
    json.message ?? "Unknown server error",
    "error",
    res.status,
  );
}

/**
 * Make a GET request to the backend API.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await safeFetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return parseJSend<T>(res);
}

/**
 * Make a POST request to the backend API.
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const payload = body !== undefined ? JSON.stringify(body) : undefined;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await safeFetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: payload,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return parseJSend<T>(res);
}

/**
 * Make a PATCH request to the backend API.
 */
export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const payload = body !== undefined ? JSON.stringify(body) : undefined;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await safeFetch(`${API_BASE}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers,
    body: payload,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return parseJSend<T>(res);
}

/**
 * Make a DELETE request to the backend API.
 */
export async function apiDelete<T>(path: string): Promise<T> {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return parseJSend<T>(res);
}
