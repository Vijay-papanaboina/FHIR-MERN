import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  createPatientAppointmentHandler,
  getPatientAppointmentHandler,
  listPatientAppointmentsHandler,
  updatePatientAppointmentHandler,
} from "../controllers/appointment.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole("practitioner", "admin"));

router.get(
  "/",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  listPatientAppointmentsHandler,
);

router.post(
  "/",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  createPatientAppointmentHandler,
);

router.get(
  "/:id",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  getPatientAppointmentHandler,
);

router.patch(
  "/:id",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  updatePatientAppointmentHandler,
);

export default router;
