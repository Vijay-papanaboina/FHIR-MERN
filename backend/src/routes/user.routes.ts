import { Router } from "express";
import {
  linkPractitionerHandler,
  listUsersHandler,
  linkPatientHandler,
  updateUserRoleHandler,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// All user management routes here are admin-only.
router.use(requireAuth, requireRole("admin"));

router.get("/", listUsersHandler);
router.patch("/:userId/link-patient", linkPatientHandler);
router.patch("/:userId/link-practitioner", linkPractitionerHandler);
router.patch("/:userId/role", updateUserRoleHandler);

export default router;
