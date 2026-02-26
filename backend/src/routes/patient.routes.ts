import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  searchPatientsHandler,
  getPatientHandler,
  getAssignedPatientsHandler,
} from "../controllers/patient.controller.js";

const router = Router();

// All patient routes require authentication
router.use(requireAuth);

// Search patients by name — admin only
router.get("/", requireRole("admin"), searchPatientsHandler);

// Get patients assigned to the current user — practitioners and admins
// IMPORTANT: /assigned MUST be registered before /:id to prevent
// Express from matching "assigned" as a patient ID parameter.
router.get(
  "/assigned",
  requireRole("practitioner", "admin"),
  getAssignedPatientsHandler,
);

// Get a single patient — requires active assignment (admin bypasses)
router.get(
  "/:id",
  requireRole("practitioner", "admin"),
  isAssignedToPatient(),
  getPatientHandler,
);

export default router;
