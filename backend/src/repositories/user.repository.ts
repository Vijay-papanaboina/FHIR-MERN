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

export interface ListUsersOptions {
  q?: string;
  page: number;
  limit: number;
}

export interface ListUsersResult {
  items: Array<{
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    fhirPatientId?: string | null;
    image?: string;
  }>;
  total: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const listUsers = async (
  options: ListUsersOptions,
): Promise<ListUsersResult> => {
  const q = (options.q ?? "").trim();
  const page = Number.isFinite(options.page) ? Math.max(1, options.page) : 1;
  const limit = Number.isFinite(options.limit)
    ? Math.max(1, options.limit)
    : 25;
  const skip = Math.max(0, (page - 1) * limit);
  const escapedQ = q ? escapeRegExp(q) : "";
  const filter = escapedQ
    ? {
        $or: [
          { name: { $regex: escapedQ, $options: "i" } },
          { email: { $regex: escapedQ, $options: "i" } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    User.find(filter, {
      _id: 1,
      name: 1,
      email: 1,
      role: 1,
      fhirPatientId: 1,
      image: 1,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ListUsersResult["items"]>(),
    User.countDocuments(filter),
  ]);

  return { items, total };
};

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
