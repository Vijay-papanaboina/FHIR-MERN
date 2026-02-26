import { Alert, type IAlert } from "../models/alert.model.js";

/**
 * Get alerts for a specific patient, sorted by most recent first.
 */
export const getAlertsByPatient = async (
  patientFhirId: string,
  limit = 50,
): Promise<IAlert[]> => {
  return Alert.find({ patientFhirId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<IAlert[]>();
};

/**
 * Get alerts that were sent to a specific user, sorted by most recent first.
 */
export const getAlertsForUser = async (
  userId: string,
  limit = 50,
): Promise<IAlert[]> => {
  return Alert.find({ sentToUserIds: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<IAlert[]>();
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
