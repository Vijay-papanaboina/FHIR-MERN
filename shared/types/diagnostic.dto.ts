export type DiagnosticReportStatus =
  | "registered"
  | "partial"
  | "preliminary"
  | "final"
  | "amended"
  | "corrected"
  | "appended"
  | "cancelled"
  | "entered-in-error"
  | "unknown";

export interface DiagnosticReportDTO {
  id: string;
  status: DiagnosticReportStatus;
  category: string | null;
  code: string;
  issued: string | null;
  effectiveDateTime: string | null;
  performer: string | null;
  conclusion: string | null;
  resultObservationIds: string[];
}

export interface DiagnosticResultDTO {
  id: string;
  status: string | null;
  code: string;
  value: string | null;
  interpretation: string | null;
  recordedAt: string | null;
}
