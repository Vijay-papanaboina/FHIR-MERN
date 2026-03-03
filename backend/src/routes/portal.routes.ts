import { Router } from "express";
import {
  getMyCareTeam,
  getMyConditions,
  getMyDemographics,
  getMyAllergies,
  getMyMedications,
  getMyVitals,
  submitMyVital,
} from "../controllers/portal.controller.js";
import {
  cancelPortalAppointmentHandler,
  createPortalAppointmentHandler,
  listPortalAppointmentsHandler,
} from "../controllers/appointment.controller.js";
import { requireAuth } from "../middleware/authGuard.js";
import { requireLinkedPatient } from "../middleware/requireLinkedPatient.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.use(requireAuth, requireRole("patient"), requireLinkedPatient);

router.get("/me", getMyDemographics);
router.get("/care-team", getMyCareTeam);
router.get("/vitals", getMyVitals);
router.get("/medications", getMyMedications);
router.get("/conditions", getMyConditions);
router.get("/allergies", getMyAllergies);
router.get("/appointments", listPortalAppointmentsHandler);
router.post("/vitals", submitMyVital);
router.post("/appointments", createPortalAppointmentHandler);
router.patch("/appointments/:id", cancelPortalAppointmentHandler);

export default router;
