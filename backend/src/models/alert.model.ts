import mongoose, { Schema, model, type Document } from "mongoose";

// ── Interface ────────────────────────────────────────────────────

export interface IAlert extends Document<string> {
  _id: string;
  patientFhirId: string;
  observationId: string;
  type: string;
  message: string;
  value: number;
  unit: string;
  severity: "warning" | "critical";
  sentToUserIds: string[];
  acknowledgedBy: string[];
  recordDate: Date;
  createdAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────

const alertSchema = new Schema<IAlert>(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    patientFhirId: { type: String, required: true },
    observationId: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    severity: {
      type: String,
      required: true,
      enum: ["warning", "critical"],
    },
    sentToUserIds: { type: [String], default: [] },
    acknowledgedBy: { type: [String], default: [] },
    recordDate: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "alert" },
);

// ── Indexes ──────────────────────────────────────────────────────

// Recent alerts by patient — used by alert history endpoints
alertSchema.index({ patientFhirId: 1, createdAt: -1 });

// Prevents duplicate alerts for the same observation
alertSchema.index({ observationId: 1 }, { unique: true });

// Alerts sent to a user — used by getAlertsForUser
alertSchema.index({ sentToUserIds: 1, createdAt: -1 });

export const Alert = model<IAlert>("Alert", alertSchema);
