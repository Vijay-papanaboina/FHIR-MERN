import type { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { jsend } from "../utils/jsend.js";
import {
  cancelPortalAppointment,
  createClinicalPatientAppointment,
  createPortalAppointment,
  decideClinicalPatientAppointment,
  getClinicalPatientAppointmentById,
  listClinicalPatientAppointments,
  listPortalAppointments,
} from "../services/appointment.service.js";

const toClinicalActor = (req: Request) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const name = req.user?.name;

  if (!userId || !role) {
    throw new AppError("Authentication required", 401);
  }

  if (role !== "admin" && role !== "practitioner") {
    throw new AppError("Access denied.", 403);
  }

  return { userId, role, ...(name ? { name } : {}) };
};

const toPortalActor = (req: Request) => {
  const userId = req.user?.id;
  const patientFhirId = req.fhirPatientId;
  const name = req.user?.name;

  if (!userId || !patientFhirId) {
    throw new AppError("Authentication required", 401);
  }

  return { userId, patientFhirId, ...(name ? { name } : {}) };
};

export const listPatientAppointmentsHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await listClinicalPatientAppointments(actor, patientFhirId);
  res.json(jsend.success(result));
};

export const createPatientAppointmentHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const result = await createClinicalPatientAppointment(
    actor,
    patientFhirId,
    req.body,
  );
  res.status(201).json(jsend.success(result));
};

export const getPatientAppointmentHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const appointmentId = String(req.params.id ?? "");
  const result = await getClinicalPatientAppointmentById(
    actor,
    patientFhirId,
    appointmentId,
  );
  res.json(jsend.success(result));
};

export const updatePatientAppointmentHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toClinicalActor(req);
  const patientFhirId = String(req.params.patientFhirId ?? "");
  const appointmentId = String(req.params.id ?? "");
  const result = await decideClinicalPatientAppointment(
    actor,
    patientFhirId,
    appointmentId,
    req.body,
  );
  res.json(jsend.success(result));
};

export const listPortalAppointmentsHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toPortalActor(req);
  const result = await listPortalAppointments(actor);
  res.json(jsend.success(result));
};

export const createPortalAppointmentHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toPortalActor(req);
  const result = await createPortalAppointment(actor, req.body);
  res.status(201).json(jsend.success(result));
};

export const cancelPortalAppointmentHandler = async (
  req: Request,
  res: Response,
) => {
  const actor = toPortalActor(req);
  const appointmentId = String(req.params.id ?? "");
  const commentRaw = req.body?.comment;
  const comment = typeof commentRaw === "string" ? commentRaw : undefined;
  const result = await cancelPortalAppointment(actor, appointmentId, {
    ...(comment !== undefined ? { comment } : {}),
  });
  res.json(jsend.success(result));
};
