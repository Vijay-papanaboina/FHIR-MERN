import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  sseStreamHandler,
  getMyAlerts,
  getPatientAlerts,
  acknowledgeAlertHandler,
} from "../controllers/alert.controller.js";
import { handleObservationWebhook } from "../services/webhook.handler.js";
import { verifyWebhookSecret } from "../middleware/verifyWebhookSecret.js";

const router = Router();

// ── Webhook (called by HAPI FHIR — verified via shared secret) ──
// Matches /webhook and any subpath (e.g. /webhook/Observation/123)
router.use("/webhook", verifyWebhookSecret, handleObservationWebhook);

// ── Authenticated routes ─────────────────────────────────────────
router.use(requireAuth, requireRole("practitioner", "admin"));

// ── SSE stream ───────────────────────────────────────────────────
router.get("/stream", sseStreamHandler);

// ── REST API ─────────────────────────────────────────────────────
router.get("/", getMyAlerts);
router.get(
  "/patient/:patientFhirId",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  getPatientAlerts,
);
router.post("/:id/acknowledge", acknowledgeAlertHandler);

export default router;
