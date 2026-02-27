import type { IUser } from "../models/auth.model.js";
import { User } from "../models/auth.model.js";

export type UserRole = IUser["role"];

export interface PractitionerLookup {
  _id: string;
  name: string;
  role: UserRole;
  image?: string;
}

export const findUserById = (userId: string) => User.findById(userId);

export const updateUserRoleById = (userId: string, role: UserRole) =>
  User.findByIdAndUpdate(userId, { role }, { new: true });

export const updateUserFieldsById = (
  userId: string,
  updates: Partial<Pick<IUser, "role" | "fhirPatientId">>,
) => User.findByIdAndUpdate(userId, updates, { new: true });

export const updateUserFhirPatientIdById = (
  userId: string,
  fhirPatientId: string,
) => User.findByIdAndUpdate(userId, { fhirPatientId }, { new: true });

const MAX_LOOKUP_IDS = 500;

export const findPractitionersByIds = async (
  userIds: string[],
): Promise<PractitionerLookup[]> => {
  if (userIds.length === 0) return [];

  const results: PractitionerLookup[] = [];
  for (let i = 0; i < userIds.length; i += MAX_LOOKUP_IDS) {
    const chunk = userIds.slice(i, i + MAX_LOOKUP_IDS);
    const practitioners = await User.find(
      { _id: { $in: chunk } },
      { name: 1, image: 1, role: 1 },
    ).lean<PractitionerLookup[]>();
    results.push(...practitioners);
  }

  return results;
};
