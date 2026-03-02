import { Router } from "express";
import { requireAuth } from "../middleware/authGuard.js";
import { requireRole } from "../middleware/requireRole.js";
import { isAssignedToPatient } from "../middleware/isAssignedToPatient.js";
import {
  createPatientConditionHandler,
  deletePatientConditionHandler,
  getPatientConditionHandler,
  listPatientConditionsHandler,
  updatePatientConditionStatusHandler,
} from "../controllers/conditions-allergies.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole("practitioner", "admin"));

router.get(
  "/",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  listPatientConditionsHandler,
);

router.post(
  "/",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  createPatientConditionHandler,
);

router.get(
  "/:id",
  isAssignedToPatient({ paramName: "patientFhirId" }),
  getPatientConditionHandler,
);

router.patch(
  "/:id",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  updatePatientConditionStatusHandler,
);

router.delete(
  "/:id",
  isAssignedToPatient("primary", "covering", { paramName: "patientFhirId" }),
  deletePatientConditionHandler,
);

export default router;
