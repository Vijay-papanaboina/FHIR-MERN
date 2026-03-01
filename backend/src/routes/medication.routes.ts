import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  listPatientMedicationsHandler,
  getPatientMedicationHandler,
  createPatientMedicationHandler,
  updatePatientMedicationStatusHandler,
} from "../controllers/medication.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole("practitioner", "admin"));

router.get(
  "/",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  listPatientMedicationsHandler,
);

router.post(
  "/",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  createPatientMedicationHandler,
);

router.get(
  "/:id",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  getPatientMedicationHandler,
);

router.patch(
  "/:id",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  updatePatientMedicationStatusHandler,
);

export default router;
