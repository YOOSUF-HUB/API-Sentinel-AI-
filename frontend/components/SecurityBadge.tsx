import type { Severity } from "@/lib/types";

const STYLES: Record<Severity, { label: string; className: string; icon: string }> = {
  CRITICAL: {
    label: "Critical",
    icon: "✕",
    className: "bg-severity-critical/15 text-severity-critical ring-severity-critical/30",
  },
  WARNING: {
    label: "Warning",
    icon: "!",
    className: "bg-severity-warning/15 text-severity-warning ring-severity-warning/30",
  },
  PASS: {
    label: "Pass",
    icon: "✓",
    className: "bg-severity-pass/15 text-severity-pass ring-severity-pass/30",
  },
};

/** Small pill conveying an issue's severity. */
export default function SecurityBadge({ severity }: { severity: Severity }) {
  const s = STYLES[severity] ?? STYLES.WARNING;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${s.className}`}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
