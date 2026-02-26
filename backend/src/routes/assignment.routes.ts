import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  createAssignmentHandler,
  deactivateAssignmentHandler,
  listAssignmentsHandler,
  getUserAssignmentsHandler,
  listPractitionersHandler,
} from "../controllers/assignment.controller.js";

const router = Router();

// All assignment routes require authentication + admin role
router.use(requireAuth, requireRole("admin"));

// ── Assignment CRUD ──────────────────────────────────────────────
router.post("/", createAssignmentHandler);
router.delete("/:id", deactivateAssignmentHandler);
router.get("/", listAssignmentsHandler);

// ── Static routes before parameterized routes ────────────────────
router.get("/practitioners", listPractitionersHandler);
router.get("/user/:userId", getUserAssignmentsHandler);

export default router;
