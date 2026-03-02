export interface JSendSuccess<T> {
  status: "success";
  data: T;
}

export interface JSendFail<F = { message: string }> {
  status: "fail";
  data: F;
}

export interface JSendError {
  status: "error";
  message: string;
}

export type JSendResponse<T, F = { message: string }> =
  | JSendSuccess<T>
  | JSendFail<F>
  | JSendError;
