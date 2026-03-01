import type {
  CreateVitalInput,
  PatientDTO,
  VitalsDTO,
} from "@fhir-mern/shared";
import { getAssignmentsByPatient } from "../repositories/assignment.repository.js";
import { getMedicationRequestsByPatient } from "../repositories/medication-request.repository.js";
import { findPractitionersByIds } from "../repositories/user.repository.js";
import { getPatient } from "./patient.service.js";
import {
  createPatientReportedVital,
  getPatientVitals,
} from "./vitals.service.js";

export interface CareTeamMemberDTO {
  userId: string;
  name: string;
  image?: string;
  assignmentRole: "primary" | "covering" | "consulting";
}

export const getPortalDemographics = (
  patientId: string,
): Promise<PatientDTO> => {
  return getPatient(patientId);
};

export const getPortalCareTeam = async (
  patientId: string,
): Promise<CareTeamMemberDTO[]> => {
  const assignments = await getAssignmentsByPatient(patientId, true);
  const practitionerIds = [
    ...new Set(assignments.map((a) => a.assignedUserId)),
  ];
  const practitioners = await findPractitionersByIds(practitionerIds);
  const practitionersById = new Map(
    practitioners.map((p) => [String(p._id), p] as const),
  );

  return assignments
    .map((assignment) => {
      const practitioner = practitionersById.get(
        String(assignment.assignedUserId),
      );
      if (!practitioner || practitioner.role !== "practitioner") {
        return null;
      }

      const member: CareTeamMemberDTO = {
        userId: String(practitioner._id),
        name: practitioner.name,
        assignmentRole: assignment.assignmentRole,
      };
      if (typeof practitioner.image === "string") {
        member.image = practitioner.image;
      }
      return member;
    })
    .filter((m): m is CareTeamMemberDTO => !!m);
};

export const getPortalVitals = (patientId: string): Promise<VitalsDTO[]> => {
  return getPatientVitals(patientId);
};

export const submitPortalVital = (
  patientId: string,
  input: CreateVitalInput,
): Promise<VitalsDTO> => {
  return createPatientReportedVital(patientId, input);
};

export const getPortalMedications = (
  patientId: string,
): Promise<Record<string, unknown>> => {
  return getMedicationRequestsByPatient(patientId);
};
