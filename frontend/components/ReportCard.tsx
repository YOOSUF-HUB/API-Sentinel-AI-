import type { CategoryScores, Issue, Report } from "@/lib/types";

import SecurityBadge from "@/components/SecurityBadge";

/** Traffic-light color for a 0-100 score. */
function scoreColor(score: number): string {
  if (score >= 80) return "text-severity-pass";
  if (score >= 50) return "text-severity-warning";
  return "text-severity-critical";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-severity-pass";
  if (score >= 50) return "bg-severity-warning";
  return "bg-severity-critical";
}

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  security: "Security",
  documentation: "Documentation",
  completeness: "Completeness",
  best_practices: "Best practices",
};

// Order issues by severity so the most urgent surface first.
const SEVERITY_RANK: Record<Issue["severity"], number> = {
  CRITICAL: 0,
  WARNING: 1,
  PASS: 2,
};

/** Renders a completed review Report: overall score, category bars, issues, summary. */
export default function ReportCard({ report }: { report: Report }) {
  const clamped = Math.max(0, Math.min(100, Math.round(report.overall_score)));
  const issues = [...report.issues].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  return (
    <div className="space-y-6 rounded-2xl border border-ink-600 bg-ink-800 p-6">
      {/* Header: overall score */}
      <div className="flex items-center gap-5">
        <div
          className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full ring-4 ring-inset ring-ink-600 ${scoreColor(
            clamped,
          )}`}
        >
          <span className="text-2xl font-bold leading-none">{clamped}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            / 100
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100">Review report</h2>
          <p className="truncate text-sm text-slate-400">{report.file_name}</p>
        </div>
      </div>

      {/* Category scores */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(CATEGORY_LABELS) as (keyof CategoryScores)[]).map((key) => {
          const value = Math.max(0, Math.min(100, Math.round(report.category_scores[key])));
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{CATEGORY_LABELS[key]}</span>
                <span className={`font-semibold ${scoreColor(value)}`}>{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-600">
                <div
                  className={`h-full rounded-full transition-all ${barColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="rounded-xl border border-ink-600 bg-ink-700/50 p-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {report.summary}
          </p>
        </div>
      )}

      {/* Issues */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Issues ({issues.length})
        </h3>
        {issues.length === 0 ? (
          <p className="rounded-lg bg-ink-700/50 px-4 py-3 text-sm text-slate-400">
            No issues surfaced for this review.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {issues.map((issue, i) => (
              <li
                key={i}
                className="rounded-xl border border-ink-600 bg-ink-700/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-semibold text-slate-100">
                    {issue.title}
                  </h4>
                  <SecurityBadge severity={issue.severity} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {issue.detail}
                </p>
                {issue.location && (
                  <p className="mt-2 font-mono text-xs text-slate-500">
                    {issue.location}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
