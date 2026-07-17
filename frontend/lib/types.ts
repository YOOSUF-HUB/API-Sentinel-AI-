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

/** One node of the agent graph, in execution order. */
export interface PipelineStep {
  node: string;
  label: string;
}

/** Sent once, before the graph runs, so every step can render as pending. */
export interface PipelineEvent {
  type: "pipeline";
  nodes: PipelineStep[];
}

// Per-node progress detail. Each node produces a different kind of artifact, so
// each has its own shape; the wire format is a loose union and callers narrow on
// `node`. Every field is optional at the boundary — an older backend streams
// progress events with no detail at all, and the UI degrades to labels only.
export interface PlannerDetail {
  sub_questions: string[];
}

export interface RetrieverDetail {
  retrieved: number;
  section_types: string[];
  top_similarity: number;
  top_k: number;
}

export interface GradedChunk {
  location: string;
  section_type: string;
  relevance: number;
}

export interface GraderDetail {
  retrieved: number;
  kept: number;
  dropped: number;
  threshold: number;
  kept_chunks: GradedChunk[];
}

export interface AnalyzerDetail {
  reasoning: string;
  missing: string[];
  issue_count: number;
  severity_counts: Record<Severity, number>;
}

export interface SynthesizerDetail {
  overall_score: number;
}

export type ProgressDetail = Partial<
  PlannerDetail &
    RetrieverDetail &
    GraderDetail &
    AnalyzerDetail &
    SynthesizerDetail
>;

/** A progress event means the named node has *completed*. */
export interface ProgressEvent {
  type: "progress";
  node: string;
  label: string;
  detail?: ProgressDetail;
}

export interface ReportEvent {
  type: "report";
  report: Report;
}

export interface ErrorEvent {
  type: "error";
  detail: string;
}

export type ReviewEvent =
  | PipelineEvent
  | ProgressEvent
  | ReportEvent
  | ErrorEvent;
