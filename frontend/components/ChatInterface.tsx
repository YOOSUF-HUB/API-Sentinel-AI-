"use client";

import { useCallback, useRef, useState } from "react";

import AgentTrace, { type TraceEvent } from "@/components/AgentTrace";
import ReportCard from "@/components/ReportCard";
import { ApiError, streamReview } from "@/lib/api";
import type { PipelineStep, Report, ReviewMode } from "@/lib/types";

// Preset review modes surfaced as one-click buttons. `custom` is driven by the
// free-form question box instead of a preset.
const PRESETS: {
  mode: Exclude<ReviewMode, "custom">;
  label: string;
  icon: string;
  question: string;
}[] = [
  {
    mode: "security",
    label: "Security",
    icon: "🔒",
    question:
      "Review this API for security issues: authentication, authorization, data exposure, and insecure defaults.",
  },
  {
    mode: "documentation",
    label: "Documentation",
    icon: "📚",
    question:
      "Review the quality and completeness of this API's documentation, examples, and descriptions.",
  },
  {
    mode: "production",
    label: "Production readiness",
    icon: "🚀",
    question:
      "Assess whether this API is production-ready: error handling, versioning, rate limiting, and reliability.",
  },
  {
    mode: "data_exposure",
    label: "Data exposure",
    icon: "🕵️",
    question:
      "Identify where this API may over-expose sensitive data or leak internal details in responses.",
  },
];

type Phase = "idle" | "running" | "done" | "error";

export interface ChatInterfaceProps {
  docId: string;
  fileName: string;
}

/** Drives a streaming review: mode presets or a custom question, live progress, final report. */
export default function ChatInterface({ docId, fileName }: ChatInterfaceProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState("");
  const [activeMode, setActiveMode] = useState<ReviewMode | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped per run so the trace's expand/collapse state doesn't leak across runs.
  const [runId, setRunId] = useState(0);

  // Guard against overlapping runs (double-click / Enter while streaming).
  const runningRef = useRef(false);

  const runReview = useCallback(
    async (mode: ReviewMode, q: string) => {
      if (runningRef.current) return;
      const trimmed = q.trim();
      if (!trimmed) {
        setError("Enter a question or pick a review mode.");
        return;
      }

      runningRef.current = true;
      setPhase("running");
      setActiveMode(mode);
      setPipeline([]);
      setTrace([]);
      setReport(null);
      setError(null);
      setRunId((n) => n + 1);

      // Step durations are measured here rather than server-side: they're what the
      // user actually waited, network included.
      const startedAt = performance.now();

      let settled = false; // saw a terminal report/error event
      try {
        for await (const event of streamReview(docId, trimmed, mode)) {
          if (event.type === "pipeline") {
            setPipeline(event.nodes);
          } else if (event.type === "progress") {
            const at = performance.now() - startedAt;
            setTrace((prev) => [
              ...prev,
              {
                node: event.node,
                label: event.label,
                detail: event.detail,
                at,
              },
            ]);
          } else if (event.type === "report") {
            setReport(event.report);
            setPhase("done");
            settled = true;
          } else if (event.type === "error") {
            setError(event.detail);
            setPhase("error");
            settled = true;
          }
        }
        if (!settled) {
          setError("The review stream ended before a report was produced.");
          setPhase("error");
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Could not reach the backend. Is it running on the configured API URL?";
        setError(msg);
        setPhase("error");
      } finally {
        runningRef.current = false;
      }
    },
    [docId],
  );

  const busy = phase === "running";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-bright">
          Review
        </h1>
        <p className="text-sm text-secondary">
          Reviewing <span className="font-medium text-body">{fileName}</span>.
          Pick a focus or ask your own question.
        </p>
      </div>

      {/* Preset modes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.mode}
            disabled={busy}
            onClick={() => {
              setQuestion("");
              runReview(preset.mode, preset.question);
            }}
            className={[
              "flex flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition duration-150 ease-out-quart",
              activeMode === preset.mode && busy
                ? "border-accent bg-accent/10"
                : "border-ink-600 bg-ink-800 hover:border-ink-500 hover:bg-ink-700",
              busy ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            <span className="text-lg">{preset.icon}</span>
            <span className="text-sm font-medium text-bright">
              {preset.label}
            </span>
          </button>
        ))}
      </div>

      {/* Custom question */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runReview("custom", question);
        }}
        className="flex items-end gap-3"
      >
        <div className="flex-1">
          <label
            htmlFor="question"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted"
          >
            Ask your own
          </label>
          <textarea
            id="question"
            value={question}
            disabled={busy}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                runReview("custom", question);
              }
            }}
            rows={2}
            placeholder="e.g. Are the pagination parameters documented consistently?"
            className="w-full resize-none rounded-xl border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm text-body placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
        </div>
        {/* Disabled drops the accent entirely rather than fading it: Signal Cyan
            means "this is the action", so a 40%-opacity cyan button reads as an
            enabled control behind fog. Unavailable is a surface, not a dimmer. */}
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors duration-150 ease-out-quart hover:bg-accent-muted disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-muted"
        >
          {busy ? "Reviewing…" : "Review"}
        </button>
      </form>

      {error && phase === "error" && (
        <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 px-4 py-3 text-sm text-severity-critical-bright motion-safe:animate-rise-in">
          {error}
        </div>
      )}

      {/* The agent's reasoning. Survives the report rather than being replaced by
          it: it's the evidence for the score sitting underneath. */}
      {phase !== "idle" && (
        <AgentTrace
          key={runId}
          pipeline={pipeline}
          events={trace}
          status={phase === "running" ? "running" : phase === "error" ? "error" : "done"}
        />
      )}

      {/* Final report */}
      {report && <ReportCard report={report} />}
    </div>
  );
}
