import { Router } from "express";
import { linkPatientHandler } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// All user management routes here are admin-only.
router.use(requireAuth, requireRole("admin"));

router.patch("/:userId/link-patient", linkPatientHandler);

export default router;
