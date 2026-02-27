import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/AppError.js";
import { requireLinkedPatient } from "../../src/middleware/requireLinkedPatient.js";

describe("requireLinkedPatient middleware", () => {
  it("sets req.fhirPatientId for linked patient", () => {
    const req = {
      user: { id: "u1", role: "patient", fhirPatientId: "1001" },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    requireLinkedPatient(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(req.fhirPatientId).toBe("1001");
  });

  it("throws AppError 403 for unlinked patient", () => {
    const req = {
      user: { id: "u1", role: "patient", fhirPatientId: null },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;
    let capturedError: unknown;
    expect(() =>
      requireLinkedPatient(req, res, next),
    ).toThrowError(/Account not yet linked to a patient record/);
    expect(() => requireLinkedPatient(req, res, next)).toThrowError(AppError);
    try {
      requireLinkedPatient(req, res, next);
    } catch (err) {
      capturedError = err;
    }
    expect(next).not.toHaveBeenCalled();
    expect((capturedError as AppError).statusCode).toBe(403);
  });
});
