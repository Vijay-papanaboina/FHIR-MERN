import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const FHIR_TIMEOUT_MS = 10_000;

/**
 * Shared headers for FHIR requests.
 * Content-Type is only needed for POST/PUT, so it's opt-in.
 */
export const getFhirHeaders = (
  includeContentType = false,
): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/fhir+json",
    "X-FHIR-Secret": env.FHIR_SECRET,
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/fhir+json";
  }

  return headers;
};

/** Normalize the FHIR base URL (strip trailing slashes). */
export const fhirBaseUrl = (): string => env.FHIR_BASE_URL.replace(/\/+$/, "");

interface FhirFetchOptions {
  method?: "GET" | "POST" | "PUT";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Shared fetch wrapper with timeout, JSON error handling, and error cause preservation.
 */
const fhirFetch = async (
  url: string,
  options: FhirFetchOptions = {},
): Promise<Record<string, unknown>> => {
  const { method = "GET", body, headers } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FHIR_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...getFhirHeaders(!!body),
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new AppError("Resource not found", 404);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const detail = bodyText.trim().slice(0, 500);
      throw new AppError(
        detail
          ? `FHIR ${method} failed with status ${response.status}: ${detail}`
          : `FHIR ${method} failed with status ${response.status}`,
        502,
      );
    }

    try {
      return (await response.json()) as Record<string, unknown>;
    } catch {
      throw new AppError("FHIR server returned malformed JSON", 502);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("FHIR request timed out", 504);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new AppError(`FHIR request failed: ${message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
};

/** GET a FHIR resource. */
export const fhirGet = (url: string) => fhirFetch(url);

/** POST a FHIR resource. */
export const fhirPost = (url: string, body: Record<string, unknown>) =>
  fhirFetch(url, { method: "POST", body });

/** PUT a FHIR resource (create or update). */
export const fhirPut = (url: string, body: Record<string, unknown>) =>
  fhirFetch(url, { method: "PUT", body });

export const fhirPutWithHeaders = (
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
) => fhirFetch(url, { method: "PUT", body, headers });
