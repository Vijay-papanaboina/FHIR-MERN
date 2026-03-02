import type {
  ListUsersResponse,
  UserRole,
  UserRowDTO,
} from "@fhir-mern/shared";
import {
  findUserByFhirPatientId,
  findUserByFhirPractitionerId,
  findUserById,
  listUsers,
  updateUserFieldsById,
  updateUserFhirPractitionerIdById,
  updateUserFhirPatientIdById,
} from "../repositories/user.repository.js";
import { getPatient } from "./patient.service.js";
import { fhirBaseUrl, fhirGet } from "../repositories/fhir.client.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export type SafeUserDTO = UserRowDTO;
export type ListUsersDTO = ListUsersResponse;

const toSafeUser = (user: {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  fhirPatientId?: string | null;
  fhirPractitionerId?: string | null;
}): SafeUserDTO => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  fhirPatientId: user.fhirPatientId ?? null,
  fhirPractitionerId: user.fhirPractitionerId ?? null,
});

export const linkPatientToUser = async (
  userId: string,
  fhirPatientId: string,
): Promise<SafeUserDTO> => {
  const normalizedFhirPatientId = String(fhirPatientId ?? "").trim();
  if (!/^[A-Za-z0-9\-.]{1,64}$/.test(normalizedFhirPatientId)) {
    throw new AppError(
      `Invalid FHIR Patient ID format: ${normalizedFhirPatientId || "<empty>"}`,
      400,
    );
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role !== "patient") {
    throw new AppError("Target user must have patient role", 403);
  }

  const existingLinkedUser = await findUserByFhirPatientId(
    normalizedFhirPatientId,
  );
  if (existingLinkedUser && String(existingLinkedUser._id) !== String(userId)) {
    throw new AppError(
      `FHIR Patient ID ${normalizedFhirPatientId} is already linked to another user`,
      409,
    );
  }

  // Verify patient exists in FHIR before linking.
  await getPatient(normalizedFhirPatientId);

  const updated = await updateUserFhirPatientIdById(
    userId,
    normalizedFhirPatientId,
  );
  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return toSafeUser(updated);
};

export const changeUserRole = async (
  userId: string,
  role: UserRole,
  actorUserId?: string,
): Promise<SafeUserDTO> => {
  const existing = await findUserById(userId);
  if (!existing) {
    throw new AppError("User not found", 404);
  }

  const updates: {
    role: UserRole;
    fhirPatientId?: string | null;
    fhirPractitionerId?: string | null;
  } = { role };
  if (existing.role === "patient" && role !== "patient") {
    updates.fhirPatientId = null;
  }
  if (existing.role === "practitioner" && role !== "practitioner") {
    updates.fhirPractitionerId = null;
  }

  const updated = await updateUserFieldsById(userId, updates);
  if (!updated) {
    throw new AppError("User not found", 404);
  }

  logger.info("user role changed", {
    actorUserId: actorUserId ?? null,
    targetUserId: userId,
    oldRole: existing.role,
    newRole: role,
  });

  return toSafeUser(updated);
};

export const linkPractitionerToUser = async (
  userId: string,
  fhirPractitionerId: string,
): Promise<SafeUserDTO> => {
  const normalizedFhirPractitionerId = String(fhirPractitionerId ?? "").trim();
  if (!/^[A-Za-z0-9\-.]{1,64}$/.test(normalizedFhirPractitionerId)) {
    throw new AppError(
      `Invalid FHIR Practitioner ID format: ${
        normalizedFhirPractitionerId || "<empty>"
      }`,
      400,
    );
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role !== "practitioner") {
    throw new AppError("Target user must have practitioner role", 403);
  }

  const existingLinkedUser = await findUserByFhirPractitionerId(
    normalizedFhirPractitionerId,
  );
  if (existingLinkedUser && String(existingLinkedUser._id) !== String(userId)) {
    throw new AppError(
      `FHIR Practitioner ID ${normalizedFhirPractitionerId} is already linked to another user`,
      409,
    );
  }

  // Verify practitioner exists in FHIR before linking.
  await fhirGet(
    `${fhirBaseUrl()}/Practitioner/${encodeURIComponent(
      normalizedFhirPractitionerId,
    )}`,
  );

  const updated = await updateUserFhirPractitionerIdById(
    userId,
    normalizedFhirPractitionerId,
  );
  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return toSafeUser(updated);
};

export const listSafeUsers = async (options: {
  q?: string;
  page: number;
  limit: number;
}): Promise<ListUsersDTO> => {
  const result = await listUsers(options);
  return {
    items: result.items.map(toSafeUser),
    total: result.total,
    page: options.page,
    limit: options.limit,
  };
};
