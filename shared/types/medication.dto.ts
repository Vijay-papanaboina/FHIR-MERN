export type MedicationStatus =
  | "active"
  | "on-hold"
  | "cancelled"
  | "completed"
  | "entered-in-error"
  | "stopped"
  | "draft"
  | "unknown";

export type UpdatableMedicationStatus = "completed" | "stopped";

export interface MedicationDTO {
  id: string;
  drugName: string;
  rxNormCode: string | null;
  dosageInstructions: string | null;
  frequency: string | null;
  prescriber: string | null;
  prescriberReference: string | null;
  startDate: string | null;
  status: MedicationStatus;
}

export interface CreateMedicationInput {
  drugName: string;
  rxNormCode?: string;
  dosageInstructions: string;
  frequency: string;
  startDate: string;
}
