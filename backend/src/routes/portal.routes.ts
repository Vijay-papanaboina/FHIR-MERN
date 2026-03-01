import { Router } from "express";
import {
  getMyCareTeam,
  getMyDemographics,
  getMyMedications,
  getMyVitals,
  submitMyVital,
} from "../controllers/portal.controller.js";
import { requireAuth } from "../middleware/authGuard.js";
import { requireLinkedPatient } from "../middleware/requireLinkedPatient.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.use(requireAuth, requireRole("patient"), requireLinkedPatient);

router.get("/me", getMyDemographics);
router.get("/care-team", getMyCareTeam);
router.get("/vitals", getMyVitals);
router.get("/medications", getMyMedications);
router.post("/vitals", submitMyVital);

export default router;
