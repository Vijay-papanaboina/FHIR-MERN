import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { sseStreamHandler } from "../controllers/alert.controller.js";

const router = Router();

// All alert routes require authentication + practitioner or admin role
router.use(requireAuth, requireRole("practitioner", "admin"));

// ── SSE stream ───────────────────────────────────────────────────
router.get("/stream", sseStreamHandler);

export default router;
