"use client";

import { useId, useState } from "react";

import type { PipelineStep, ProgressDetail, Severity } from "@/lib/types";

/** A completed node, with the moment it landed (ms since the run started). */
export interface TraceEvent {
  node: string;
  label: string;
  detail?: ProgressDetail;
  at: number;
}

export type TraceStatus = "running" | "done" | "error";

export interface AgentTraceProps {
  /** The graph's nodes in execution order. Empty until the pipeline event lands. */
  pipeline: PipelineStep[];
  /** Completed nodes, in arrival order. */
  events: TraceEvent[];
  status: TraceStatus;
}

type StepStatus = "pending" | "running" | "done" | "failed";

const STATUS_TEXT: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running",
  done: "Completed",
  failed: "Failed",
};

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * The agent's reasoning as it happens: what it planned, what it retrieved, what it
 * discarded, what it concluded.
 *
 * A progress event means a node *finished*, so the node that's running now is the
 * first one we haven't heard from — which is why the pipeline is streamed up front
 * rather than inferred from the events themselves.
 */
export default function AgentTrace({ pipeline, events, status }: AgentTraceProps) {
  const panelId = useId();
  // null = follow the run (open while working, collapsed once the report lands).
  // Set once the user takes over.
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? status !== "done";

  // Fall back to deriving the shape from the events themselves: the frontend and
  // backend deploy separately, so a Vercel build can meet a Render instance that
  // predates the pipeline event.
  const steps: PipelineStep[] =
    pipeline.length > 0
      ? pipeline
      : events.map(({ node, label }) => ({ node, label }));

  const completed = new Map<string, { detail?: ProgressDetail; duration: number }>();
  events.forEach((event, i) => {
    const previous = i > 0 ? events[i - 1].at : 0;
    completed.set(event.node, {
      detail: event.detail,
      duration: Math.max(0, event.at - previous),
    });
  });

  const currentIndex = steps.findIndex((step) => !completed.has(step.node));
  const current = currentIndex === -1 ? null : steps[currentIndex];
  const totalElapsed = events.length > 0 ? events[events.length - 1].at : 0;

  function statusFor(index: number, node: string): StepStatus {
    if (completed.has(node)) return "done";
    if (index !== currentIndex) return "pending";
    if (status === "error") return "failed";
    if (status === "running") return "running";
    return "pending";
  }

  let subtitle: string;
  let live: string;
  if (status === "error") {
    subtitle = current ? `Failed at ${current.label.toLowerCase()}` : "Run failed";
    live = subtitle;
  } else if (status === "done") {
    subtitle = `${steps.length} step${steps.length === 1 ? "" : "s"} · ${formatDuration(totalElapsed)}`;
    live = "Review complete.";
  } else if (current) {
    subtitle = current.label;
    live = `Step ${currentIndex + 1} of ${steps.length}: ${current.label}`;
  } else {
    subtitle = "Starting…";
    live = "Starting review.";
  }

  return (
    <section className="rounded-xl border border-ink-600 bg-ink-800">
      <p className="sr-only" aria-live="polite">
        {live}
      </p>

      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOverride(!open)}
          className="flex w-full items-center gap-3 rounded-xl px-5 py-3.5 text-left transition-colors duration-200 ease-out-quart hover:bg-ink-700/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <RunIndicator status={status} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-100">
              Agent trace
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-400">
              {subtitle}
            </span>
          </span>
          <Chevron open={open} />
        </button>
      </h3>

      {open && steps.length > 0 && (
        <div id={panelId} className="border-t border-ink-600 px-5 py-4">
          <ol>
            {steps.map((step, i) => {
              const stepStatus = statusFor(i, step.node);
              const record = completed.get(step.node);
              return (
                <li
                  key={step.node}
                  className="relative grid grid-cols-[18px_1fr] gap-x-3 pb-5 last:pb-0"
                >
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 left-[8px] top-[22px] w-px bg-ink-600"
                    />
                  )}

                  <StepIndicator status={stepStatus} />

                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h4
                        className={
                          stepStatus === "pending"
                            ? "text-sm text-slate-400"
                            : stepStatus === "running"
                              ? "text-sm font-medium text-slate-100"
                              : "text-sm text-slate-200"
                        }
                      >
                        <span className="sr-only">
                          {STATUS_TEXT[stepStatus]}:{" "}
                        </span>
                        {step.label}
                      </h4>
                      {record && (
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">
                          {formatDuration(record.duration)}
                        </span>
                      )}
                    </div>
                    <StepPayload node={step.node} detail={record?.detail} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------
// Signal Cyan marks the live step and nothing else (the One Voice Rule), so a
// finished step resolves to a neutral check rather than borrowing the severity
// palette's green — a completed node is not a severity.
function StepIndicator({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] text-slate-300" aria-hidden="true">
        <circle cx="9" cy="9" r="8" className="fill-ink-700" />
        <path
          d="M5.5 9.25 7.75 11.5 12.5 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "failed") {
    return (
      <svg
        viewBox="0 0 18 18"
        className="h-[18px] w-[18px] text-severity-critical"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="8" fill="currentColor" fillOpacity="0.15" />
        <path
          d="M6.25 6.25 11.75 11.75M11.75 6.25 6.25 11.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (status === "running") {
    return (
      <svg
        viewBox="0 0 18 18"
        className="h-[18px] w-[18px] text-accent motion-safe:animate-trace-pulse"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="9" cy="9" r="3" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] text-ink-500" aria-hidden="true">
      <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RunIndicator({ status }: { status: TraceStatus }) {
  if (status === "running") {
    return (
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full bg-accent motion-safe:animate-trace-pulse"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`h-2 w-2 shrink-0 rounded-full ${
        status === "error" ? "bg-severity-critical" : "bg-ink-500"
      }`}
    />
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out-quart ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------
// Each node produces a different kind of artifact, so each renders as what it
// actually is: the planner shows the questions it wrote, the grader shows a
// narrowing, the analyzer shows findings. Uniform rows would flatten that away.
function StepPayload({ node, detail }: { node: string; detail?: ProgressDetail }) {
  if (!detail) return null;

  switch (node) {
    case "query_planner":
      return <PlannerPayload detail={detail} />;
    case "retriever":
      return <RetrieverPayload detail={detail} />;
    case "relevance_grader":
      return <GraderPayload detail={detail} />;
    case "analyzer":
      return <AnalyzerPayload detail={detail} />;
    case "synthesizer":
      return <SynthesizerPayload detail={detail} />;
    default:
      return null;
  }
}

function PlannerPayload({ detail }: { detail: ProgressDetail }) {
  const questions = detail.sub_questions ?? [];
  if (questions.length === 0) return null;

  return (
    <ol className="mt-2 space-y-1.5">
      {questions.map((question, i) => (
        <li
          key={i}
          style={{ animationDelay: `${i * 50}ms` }}
          className="flex gap-2.5 motion-safe:animate-trace-in"
        >
          <span className="shrink-0 pt-px text-xs tabular-nums text-slate-400">
            {i + 1}
          </span>
          <span className="max-w-[68ch] text-pretty text-sm leading-relaxed text-slate-300">
            {question}
          </span>
        </li>
      ))}
    </ol>
  );
}

function RetrieverPayload({ detail }: { detail: ProgressDetail }) {
  const retrieved = detail.retrieved ?? 0;
  const sectionTypes = detail.section_types ?? [];
  const topSimilarity = detail.top_similarity ?? 0;
  const topK = detail.top_k;

  if (retrieved === 0) {
    return (
      <p className="mt-2 text-sm text-slate-300 motion-safe:animate-trace-in">
        No sections matched — the review will run without retrieved context.
      </p>
    );
  }

  return (
    <div className="mt-2 motion-safe:animate-trace-in">
      <p className="text-sm text-slate-300">
        <span className="font-medium tabular-nums text-slate-100">{retrieved}</span>{" "}
        section{retrieved === 1 ? "" : "s"} retrieved
        {typeof topK === "number" && <> · top {topK} per sub-question</>} · best
        match{" "}
        <span className="tabular-nums text-slate-200">
          {topSimilarity.toFixed(2)}
        </span>
      </p>
      {sectionTypes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {sectionTypes.map((type) => (
            <li
              key={type}
              className="rounded bg-ink-700 px-1.5 py-0.5 text-xs text-slate-300"
            >
              {type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GraderPayload({ detail }: { detail: ProgressDetail }) {
  const retrieved = detail.retrieved ?? 0;
  const kept = detail.kept ?? 0;
  const dropped = detail.dropped ?? 0;
  const threshold = detail.threshold ?? 0;
  const keptChunks = detail.kept_chunks ?? [];

  return (
    <div className="mt-2 space-y-2 motion-safe:animate-trace-in">
      <p className="text-sm text-slate-300">
        <span className="sr-only">
          {retrieved} retrieved, {kept} kept
          {dropped > 0
            ? `, ${dropped} dropped below the relevance threshold of ${threshold.toFixed(2)}.`
            : "."}
        </span>
        <span aria-hidden="true">
          <span className="font-medium tabular-nums text-slate-100">{retrieved}</span>{" "}
          retrieved
          <span className="mx-1.5 text-slate-400">→</span>
          <span className="font-medium tabular-nums text-slate-100">{kept}</span> kept
          {dropped > 0 && (
            <>
              {" · "}
              <span className="tabular-nums">{dropped}</span> dropped below{" "}
              <span className="tabular-nums">{threshold.toFixed(2)}</span>
            </>
          )}
        </span>
      </p>

      {kept === 0 && retrieved > 0 && (
        <p className="text-sm text-slate-300">
          Nothing cleared the threshold — the analysis runs without context.
        </p>
      )}

      {keptChunks.length > 0 && (
        // Capped: a location stranded from its score by half a viewport is two
        // facts, not one row.
        <ul className="max-w-sm space-y-1">
          {keptChunks.map((chunk, i) => (
            <li
              key={`${chunk.location}-${i}`}
              className="flex items-baseline justify-between gap-3"
            >
              {/* Mono because the location is verbatim from the user's spec. */}
              <span className="truncate font-mono text-xs text-slate-300">
                {chunk.location}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                {chunk.relevance.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SEVERITY_LABEL: Record<Severity, { one: string; many: string; dot: string }> = {
  CRITICAL: { one: "critical", many: "critical", dot: "bg-severity-critical" },
  WARNING: { one: "warning", many: "warnings", dot: "bg-severity-warning" },
  PASS: { one: "pass", many: "passes", dot: "bg-severity-pass" },
};

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "WARNING", "PASS"];

function AnalyzerPayload({ detail }: { detail: ProgressDetail }) {
  const reasoning = detail.reasoning ?? "";
  const missing = detail.missing ?? [];
  const issueCount = detail.issue_count ?? 0;
  const counts = detail.severity_counts;

  const present = counts
    ? SEVERITY_ORDER.filter((severity) => (counts[severity] ?? 0) > 0)
    : [];

  return (
    <div className="mt-2 space-y-2.5 motion-safe:animate-trace-in">
      {issueCount === 0 ? (
        <p className="text-sm text-slate-300">No issues surfaced.</p>
      ) : (
        present.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {present.map((severity) => {
              const count = counts?.[severity] ?? 0;
              const label = SEVERITY_LABEL[severity];
              return (
                <li
                  key={severity}
                  className="flex items-center gap-1.5 text-sm text-slate-300"
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${label.dot}`}
                  />
                  <span className="font-medium tabular-nums text-slate-100">
                    {count}
                  </span>
                  <span>{count === 1 ? label.one : label.many}</span>
                </li>
              );
            })}
          </ul>
        )
      )}

      {reasoning && (
        <p className="max-w-[68ch] text-pretty text-sm leading-relaxed text-slate-300">
          {reasoning}
        </p>
      )}

      {missing.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Not documented ({missing.length})
          </h5>
          <ul className="mt-1.5 space-y-1">
            {missing.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span aria-hidden="true" className="text-slate-400">
                  —
                </span>
                <span className="max-w-[68ch] text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SynthesizerPayload({ detail }: { detail: ProgressDetail }) {
  if (typeof detail.overall_score !== "number") return null;
  return (
    <p className="mt-2 text-sm text-slate-300 motion-safe:animate-trace-in">
      Scored{" "}
      <span className="font-medium tabular-nums text-slate-100">
        {detail.overall_score}
      </span>
      /100 across four categories.
    </p>
  );
}
