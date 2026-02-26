import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  getVitalsHandler,
  createVitalHandler,
} from "../controllers/vitals.controller.js";

const router = Router({ mergeParams: true });

// All vitals routes require authentication + practitioner or admin role
router.use(requireAuth, requireRole("practitioner", "admin"));

// GET — any active assignment role (including consulting) can read vitals
router.get("/", isAssignedToPatient(), getVitalsHandler);

// POST — consulting role is excluded; only primary and covering can create
router.post(
  "/",
  isAssignedToPatient("primary", "covering"),
  createVitalHandler,
);

export default router;
