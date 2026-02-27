import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const loggerMocks = vi.hoisted(() => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const alertModelMocks = vi.hoisted(() => ({
  Alert: {
    create: vi.fn(),
  },
}));

const thresholdMocks = vi.hoisted(() => ({
  evaluateObservation: vi.fn(),
}));

const assignmentRepoMocks = vi.hoisted(() => ({
  getAssignmentsByPatient: vi.fn(),
}));

const userModelMocks = vi.hoisted(() => ({
  User: {
    find: vi.fn(),
  },
}));

const sseMocks = vi.hoisted(() => ({
  sendToUsers: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => loggerMocks);
vi.mock("../../src/models/alert.model.js", () => alertModelMocks);
vi.mock("../../src/services/thresholds.js", () => thresholdMocks);
vi.mock("../../src/repositories/assignment.repository.js", () => assignmentRepoMocks);
vi.mock("../../src/models/auth.model.js", () => userModelMocks);
vi.mock("../../src/services/sse.manager.js", () => sseMocks);

import { handleObservationWebhook } from "../../src/services/webhook.handler.js";

const createReqRes = (body: Record<string, unknown>) => {
  const req = { body } as Request;
  const statusMock = vi.fn().mockReturnThis();
  const jsonMock = vi.fn().mockReturnThis();
  const res = {
    status: statusMock,
    json: jsonMock,
  } as unknown as Response;
  return { req, res, statusMock, jsonMock };
};

describe("webhook.handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userModelMocks.User.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: "admin-1" }]),
    });
    assignmentRepoMocks.getAssignmentsByPatient.mockResolvedValue([
      { assignmentRole: "primary", assignedUserId: "prac-1" },
      { assignmentRole: "consulting", assignedUserId: "prac-2" },
    ]);
    thresholdMocks.evaluateObservation.mockReturnValue({
      type: "CRITICAL_HIGH_HEART_RATE",
      message: "critical",
      value: 140,
      unit: "bpm",
      severity: "critical",
      patientFhirId: "p1",
      observationId: "obs-1",
      recordDate: "2026-02-27T00:00:00.000Z",
    });
    alertModelMocks.Alert.create.mockResolvedValue({
      _id: "alert-1",
      patientFhirId: "p1",
      observationId: "obs-1",
      type: "CRITICAL_HIGH_HEART_RATE",
      message: "critical",
      value: 140,
      unit: "bpm",
      severity: "critical",
      recordDate: new Date("2026-02-27T00:00:00.000Z"),
      createdAt: new Date("2026-02-27T00:00:01.000Z"),
    });
  });

  it("always responds 200 and dispatches alert to recipients", async () => {
    const { req, res, statusMock, jsonMock } = createReqRes({
      resourceType: "Observation",
      id: "obs-1",
    });

    await handleObservationWebhook(req, res);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      received: true,
    });
    expect(sseMocks.sendToUsers).toHaveBeenCalledWith(
      ["prac-1", "admin-1"],
      expect.objectContaining({ event: "alert" }),
    );
  });

  it("returns early for non-observation resources", async () => {
    const { req, res, statusMock } = createReqRes({
      resourceType: "Patient",
      id: "p1",
    });
    await handleObservationWebhook(req, res);

    expect(thresholdMocks.evaluateObservation).not.toHaveBeenCalled();
    expect(alertModelMocks.Alert.create).not.toHaveBeenCalled();
    expect(sseMocks.sendToUsers).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it("swallows duplicate-key insert errors", async () => {
    alertModelMocks.Alert.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    const { req, res, statusMock } = createReqRes({
      resourceType: "Observation",
      id: "obs-dup",
    });

    await expect(handleObservationWebhook(req, res)).resolves.toBeUndefined();
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(sseMocks.sendToUsers).not.toHaveBeenCalled();
  });
});
