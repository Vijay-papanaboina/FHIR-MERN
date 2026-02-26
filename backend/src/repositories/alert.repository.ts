import { Alert, type IAlert } from "../models/alert.model.js";

/**
 * Get alerts for a specific patient, sorted by most recent first.
 */
export const getAlertsByPatient = async (
  patientFhirId: string,
  options: { limit?: number; skip?: number } = {},
): Promise<{ items: IAlert[]; total: number }> => {
  const limit = options.limit ?? 50;
  const skip = options.skip ?? 0;

  const [items, total] = await Promise.all([
    Alert.find({ patientFhirId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IAlert[]>(),
    Alert.countDocuments({ patientFhirId }),
  ]);

  return { items, total };
};

/**
 * Get all alerts (admin global feed), sorted by most recent first.
 */
export const getAllAlerts = async (
  options: { limit?: number; skip?: number } = {},
): Promise<{ items: IAlert[]; total: number }> => {
  const limit = options.limit ?? 50;
  const skip = options.skip ?? 0;

  const [items, total] = await Promise.all([
    Alert.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IAlert[]>(),
    Alert.countDocuments(),
  ]);

  return { items, total };
};

/**
 * Get alerts that were sent to a specific user, sorted by most recent first.
 */
export const getAlertsForUser = async (
  userId: string,
  options: { limit?: number; skip?: number } = {},
): Promise<{ items: IAlert[]; total: number }> => {
  const limit = options.limit ?? 50;
  const skip = options.skip ?? 0;

  const [items, total] = await Promise.all([
    Alert.find({ sentToUserIds: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IAlert[]>(),
    Alert.countDocuments({ sentToUserIds: userId }),
  ]);

  return { items, total };
};

/**
 * Acknowledge an alert — adds the userId to the acknowledgedBy array
 * if not already present. Returns the updated alert, or null if not found.
 */
export const acknowledgeAlert = async (
  alertId: string,
  userId: string,
): Promise<IAlert | null> => {
  return Alert.findByIdAndUpdate(
    alertId,
    { $addToSet: { acknowledgedBy: userId } },
    { new: true },
  ).lean<IAlert | null>();
};

import mongoose from "mongoose";

/**
 * Fetch a single alert by its ID.
 * Returns null for invalid ObjectIds.
 */
export const getAlertById = async (alertId: string): Promise<IAlert | null> => {
  if (!mongoose.isValidObjectId(alertId)) return null;
  return Alert.findById(alertId).lean<IAlert | null>();
};
