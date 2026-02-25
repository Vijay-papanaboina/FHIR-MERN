import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import {
  searchPatientsHandler,
  getPatientHandler,
} from "../controllers/patient.controller.js";

const router = Router();

// All patient routes require authentication
router.use(requireAuth);

router.get("/", searchPatientsHandler);
router.get("/:id", getPatientHandler);

export default router;
