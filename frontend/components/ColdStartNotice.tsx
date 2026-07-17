"use client";

import { useEffect, useState } from "react";

/**
 * Explains the one delay the trace can't: the backend's cold start.
 *
 * The frontend is on Vercel, but the backend is a free Render instance that
 * sleeps when idle, and it embeds in-process with sentence-transformers rather
 * than calling a hosted API. So the first request after a wake pays for the
 * instance booting *and* a ~90 MB model loading on a shared CPU — minutes,
 * where the warm path is seconds. Nothing in the stream reports that, because
 * it happens underneath a node that hasn't reported yet. Everywhere else, the
 * trace already answers "why is this slow" by naming the node that's running.
 *
 * `since` is the moment the *current* wait began — a run's start, or the last
 * node to land — not the run's total elapsed. A run that's moving never trips
 * this, however long it takes overall.
 */

type Stage = 0 | 1 | 2;

// Two thresholds, set by what can honestly be claimed at each. A warm ingest is
// a second or two and a warm node is under five, so 10s is already anomalous —
// but it is not yet *evidence* of a cold start, which is why stage 1 hedges.
// By 45s nothing else explains it, so stage 2 names it and quotes a real
// number. Asserting "a few minutes" at ten seconds would make every merely-slow
// run look broken, which is the opposite of the point.
const HEDGE_MS = 10_000;
const NAMED_MS = 45_000;

const COPY: Record<Exclude<Stage, 0>, { lead: string; body: string }> = {
  1: {
    lead: "This is taking longer than usual.",
    body:
      "The backend runs on a free instance that sleeps when idle and reloads its " +
      "embedding model on the first request after it wakes. If that's what's " +
      "happening here, it'll clear on its own.",
  },
  2: {
    lead: "Still waking up.",
    body:
      "A cold start loads a ~90 MB embedding model into memory on a shared CPU, " +
      "which can take a few minutes. Nothing is stuck — refreshing would only " +
      "start the wait over.",
  },
};

export default function ColdStartNotice({ since }: { since: number | null }) {
  const [stage, setStage] = useState<Stage>(0);

  useEffect(() => {
    setStage(0);
    if (since === null) return;

    // Timers, not a 1s interval: exactly two moments change anything, and
    // ticking 45 times to find them is 45 renders that each say the same thing.
    // Measured from `since` rather than from now, so a notice mounting mid-wait
    // still fires on the wait's real clock.
    const elapsed = performance.now() - since;
    const hedge = setTimeout(() => setStage(1), Math.max(0, HEDGE_MS - elapsed));
    const named = setTimeout(() => setStage(2), Math.max(0, NAMED_MS - elapsed));
    return () => {
      clearTimeout(hedge);
      clearTimeout(named);
    };
  }, [since]);

  const copy = stage === 0 ? null : COPY[stage];

  return (
    <>
      {/* Mounted for the whole wait, following the trace's pattern: a live
          region has to exist before its content changes or the insertion is
          missed. The screen-reader user has the least other evidence that
          anything is still happening, so this is the one who needs it most. */}
      <p className="sr-only" aria-live="polite">
        {copy ? `${copy.lead} ${copy.body}` : ""}
      </p>

      {copy && (
        // Neutral, deliberately. A cold start is infrastructure, not a finding:
        // amber here would collide with the warnings this same run is about to
        // report about the user's spec (the Earned Alarm Rule), and cyan means
        // *live*, which the running node is already saying two panels down.
        // Keyed by stage so the wording change at 45s arrives rather than
        // silently swapping under someone who has stopped watching it.
        <div
          key={stage}
          className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 motion-safe:animate-rise-in"
        >
          <p className="max-w-[68ch] text-pretty text-sm leading-relaxed text-body">
            <span className="font-medium text-bright">{copy.lead}</span>{" "}
            {copy.body}
          </p>
        </div>
      )}
    </>
  );
}
