import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import {
  getVitalsHandler,
  createVitalHandler,
} from "../controllers/vitals.controller.js";

const router = Router({ mergeParams: true });

// All vitals routes require authentication
router.use(requireAuth);

router.get("/", getVitalsHandler);
router.post("/", createVitalHandler);

export default router;
