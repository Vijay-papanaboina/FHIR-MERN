import { Router } from "express";
import {
  linkPatientHandler,
  updateUserRoleHandler,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// All user management routes here are admin-only.
router.use(requireAuth, requireRole("admin"));

router.patch("/:userId/link-patient", linkPatientHandler);
router.patch("/:userId/role", updateUserRoleHandler);

export default router;
