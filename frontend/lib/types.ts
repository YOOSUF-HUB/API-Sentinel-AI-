// Shared types mirroring the backend Pydantic models (backend/models/schemas.py).
// Keep these in sync with the FastAPI contract.

export type Severity = "CRITICAL" | "WARNING" | "PASS";

export type ReviewMode =
  | "security"
  | "documentation"
  | "production"
  | "data_exposure"
  | "custom";

export interface UploadResponse {
  doc_id: string;
  file_name: string;
  chunk_count: number;
  section_types: string[];
}

export interface Issue {
  severity: Severity;
  title: string;
  detail: string;
  location: string | null;
}

export interface CategoryScores {
  security: number;
  documentation: number;
  completeness: number;
  best_practices: number;
}

export interface Report {
  doc_id: string;
  file_name: string;
  overall_score: number;
  category_scores: CategoryScores;
  issues: Issue[];
  summary: string;
}

export interface DeleteResponse {
  deleted: number;
  doc_id: string;
}

// Streaming /review NDJSON event shapes.
export interface ProgressEvent {
  type: "progress";
  node: string;
  label: string;
}

export interface ReportEvent {
  type: "report";
  report: Report;
}

export interface ErrorEvent {
  type: "error";
  detail: string;
}

export type ReviewEvent = ProgressEvent | ReportEvent | ErrorEvent;
