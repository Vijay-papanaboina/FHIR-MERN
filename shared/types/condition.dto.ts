export type ConditionStatus =
  | "active"
  | "inactive"
  | "resolved"
  | "entered-in-error"
  | "unknown";

export type UpdatableConditionStatus =
  | "inactive"
  | "resolved"
  | "entered-in-error";

export interface ConditionDTO {
  id: string;
  diagnosis: string;
  snomedCode: string | null;
  status: ConditionStatus;
  recordedDate: string | null;
  recorder: string | null;
  note: string | null;
}

export interface CreateConditionInput {
  diagnosis: string;
  snomedCode?: string;
  recordedDate: string;
  note?: string;
  clinicalStatus?: "active" | "inactive" | "resolved";
}
