import { Schema, model, Document } from "mongoose";

export type AssignmentRole = "primary" | "covering" | "consulting";

export interface IAssignment extends Document {
  patientFhirId: string;
  assignedUserId: string;
  assignedByUserId: string;
  assignmentRole: AssignmentRole;
  active: boolean;
  assignedAt: Date;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    patientFhirId: { type: String, required: true },
    assignedUserId: { type: String, required: true },
    assignedByUserId: { type: String, required: true },
    assignmentRole: {
      type: String,
      enum: ["primary", "covering", "consulting"],
      required: true,
    },
    active: { type: Boolean, default: true, required: true },
    assignedAt: { type: Date, default: Date.now, required: true },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────

// Middleware lookup: is this user assigned to this patient?
assignmentSchema.index(
  { patientFhirId: 1, assignedUserId: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);

// Fetch all active assignments for a patient (admin view, assignment service)
assignmentSchema.index({ patientFhirId: 1, active: 1 });

// Fetch a practitioner's active patient list (GET /patients/assigned)
assignmentSchema.index({ assignedUserId: 1, active: 1 });

export const Assignment = model<IAssignment>("assignment", assignmentSchema);
