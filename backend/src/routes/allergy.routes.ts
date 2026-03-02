import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  createPatientAllergyHandler,
  deletePatientAllergyHandler,
  getPatientAllergyHandler,
  listPatientAllergiesHandler,
  updatePatientAllergyStatusHandler,
} from "../controllers/conditions-allergies.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole("practitioner", "admin"));

router.get(
  "/",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  listPatientAllergiesHandler,
);

router.post(
  "/",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  createPatientAllergyHandler,
);

router.get(
  "/:id",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  getPatientAllergyHandler,
);

router.patch(
  "/:id",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  updatePatientAllergyStatusHandler,
);

router.delete(
  "/:id",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  deletePatientAllergyHandler,
);

export default router;
