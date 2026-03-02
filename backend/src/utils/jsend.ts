import type {
  JSendError as ErrorResponse,
  JSendFail as FailResponse,
  JSendResponse,
  JSendSuccess as SuccessResponse,
} from "@fhir-mern/shared";

/**
 * JSend response helpers.
 *
 * @see https://github.com/omniti-labs/jsend
 *
 * Usage:
 *   res.json(jsend.success({ patient }));
 *   res.status(400).json(jsend.fail({ email: 'Email is required' }));
 *   res.status(500).json(jsend.error('Internal Server Error'));
 */

export type { SuccessResponse, FailResponse, ErrorResponse, JSendResponse };

export const jsend = {
  /**
   * The request was processed correctly.
   * Wraps the payload in `{ status: "success", data }`.
   */
  success<T>(data: T): SuccessResponse<T> {
    return { status: "success", data };
  },

  /**
   * The client sent bad input (validation error, missing field, etc.).
   * Wraps field-level error details in `{ status: "fail", data }`.
   */
  fail<T>(data: T): FailResponse<T> {
    return { status: "fail", data };
  },

  /**
   * The server encountered an unexpected problem.
   * Returns `{ status: "error", message }`.
   */
  error(message: string): ErrorResponse {
    return { status: "error", message };
  },
};
