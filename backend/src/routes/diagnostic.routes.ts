import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  getPatientDiagnosticHandler,
  listPatientDiagnosticResultsHandler,
  listPatientDiagnosticsHandler,
} from "../controllers/diagnostics.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole("practitioner", "admin"));

router.get(
  "/",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  listPatientDiagnosticsHandler,
);

router.get(
  "/:id",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  getPatientDiagnosticHandler,
);

router.get(
  "/:id/results",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  listPatientDiagnosticResultsHandler,
);

export default router;
