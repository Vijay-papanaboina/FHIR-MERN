import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { sseStreamHandler } from "../controllers/alert.controller.js";
import { handleObservationWebhook } from "../services/webhook.handler.js";
import { verifyWebhookSecret } from "../middleware/verifyWebhookSecret.js";

const router = Router();

// ── Webhook (called by HAPI FHIR — verified via shared secret) ──
router.post("/webhook", verifyWebhookSecret, handleObservationWebhook);

// ── Authenticated routes ─────────────────────────────────────────
router.use(requireAuth, requireRole("practitioner", "admin"));

// ── SSE stream ───────────────────────────────────────────────────
router.get("/stream", sseStreamHandler);

export default router;
