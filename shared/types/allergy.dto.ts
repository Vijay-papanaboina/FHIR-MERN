export type AllergyStatus =
  | "active"
  | "inactive"
  | "resolved"
  | "entered-in-error"
  | "unknown";

export type UpdatableAllergyStatus =
  | "inactive"
  | "resolved"
  | "entered-in-error";

export interface AllergyDTO {
  id: string;
  substance: string;
  snomedCode: string | null;
  status: AllergyStatus;
  recordedDate: string | null;
  recorder: string | null;
  reaction: string | null;
  criticality: "low" | "high" | "unable-to-assess" | null;
  note: string | null;
}

export interface CreateAllergyInput {
  substance: string;
  snomedCode?: string;
  recordedDate: string;
  note?: string;
  reaction?: string;
  criticality?: "low" | "high" | "unable-to-assess";
  clinicalStatus?: "active" | "inactive" | "resolved";
}
