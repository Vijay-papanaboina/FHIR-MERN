/**
 * Thin wrapper around fetch for our backend API calls.
 * - Prepends the backend base URL.
 * - Sets credentials: "include" so the Better-Auth session cookie is sent.
 * - Parses JSend responses and throws on "fail" / "error" status.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Shape of a JSend success response */
export interface JSendSuccess<T> {
    status: "success";
    data: T;
}

/** Shape of a JSend fail response */
export interface JSendFail {
    status: "fail";
    data: { message: string };
}

/** Shape of a JSend error response */
export interface JSendError {
    status: "error";
    message: string;
}

type JSendResponse<T> = JSendSuccess<T> | JSendFail | JSendError;

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
    }
}


/**
 * Make a GET request to the backend API.
 */
export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
    });

    const json: JSendResponse<T> = await res.json();

    if (json.status === "success") return json.data;
    if (json.status === "fail") throw new ApiError(json.data.message, "fail", res.status);
    throw new ApiError(json.message, "error", res.status);
}

/**
 * Make a POST request to the backend API.
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
    });

    const json: JSendResponse<T> = await res.json();

    if (json.status === "success") return json.data;
    if (json.status === "fail") throw new ApiError(json.data.message, "fail", res.status);
    throw new ApiError(json.message, "error", res.status);
}
