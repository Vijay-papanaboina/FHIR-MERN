import type { PatientDTO } from "@fhir-mern/shared";
import {
  searchPatientsByName,
  getPatientById,
} from "../repositories/patient.repository.js";
import { toPatientDTO, toBundleOfPatientDTOs } from "./patient.mapper.js";

/**
 * Search patients by name.
 * Calls the repository, then maps results through the Patient Mapper.
 */
export const searchPatients = async (name: string): Promise<PatientDTO[]> => {
  const bundle = await searchPatientsByName(name);
  return toBundleOfPatientDTOs(bundle);
};

/**
 * Get a single patient by FHIR ID.
 * Calls the repository, then maps the result through the Patient Mapper.
 */
export const getPatient = async (id: string): Promise<PatientDTO> => {
  const resource = await getPatientById(id);
  return toPatientDTO(resource);
};
