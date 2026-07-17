import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark dashboard palette.
        ink: {
          900: "#0a0c10",
          800: "#0f1218",
          700: "#161b24",
          600: "#1e2530",
          500: "#2a3340",
        },
        // Text roles, per DESIGN.md §2. Every text color in the app comes from
        // here; raw slate-* is drift. Ratios are measured against ink-700/50,
        // the lightest surface any of these actually land on.
        bright: "#f1f5f9", // 16.47:1 — headings, emphasized values
        body: "#e2e8f0", // 14.63:1 — prose the user reads
        secondary: "#94a3b8", // 7.04:1 — descriptions, supporting detail
        muted: "#7c8ba1", // 5.21:1 — labels, locations, timings
        accent: {
          DEFAULT: "#38bdf8",
          muted: "#0ea5e9",
        },
        severity: {
          critical: {
            DEFAULT: "#ef4444",
            // Red is far darker than amber or green at the same nominal step, so
            // #ef4444 on its own 15% tint lands at 4.18:1 while warning and pass
            // clear 6:1. This is critical's text tone wherever it sits on that
            // tint; the ring and bars keep the canonical red.
            bright: "#f87171", // 5.68:1 on the badge tint
          },
          warning: "#f59e0b",
          pass: "#22c55e",
        },
      },
      // `out-quart` moves anything that arrives or travels — it is the default
      // and usually the answer. Don't add a curve here without a reason as
      // concrete as the two below; an unused curve is how call sites start
      // picking their own, which is the same drift that let nine grays into the
      // text roles. (The loops' symmetric curve deliberately isn't here: it's
      // only ever an animation curve, so it lives in those shorthands rather
      // than generating an `ease-` utility nobody should reach for.)
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",

        // `unfold` / `fold` exist for exactly one property: grid-template-rows
        // between 0fr and 1fr, on the agent trace's disclosure.
        //
        // That interpolates linearly in `fr`, but fr maps to pixels as a SQUARE:
        // height = H·f². Measured in Chrome, a plain `linear` timing function
        // already produces height = H·(1-t)² on collapse. So whatever curve you
        // name here gets squared before anyone sees it, and out-quart lands as
        // (1-t)⁸ — a snap with a long tail, not a fold.
        //
        // The squaring is symmetric, which is why one curve cannot serve both
        // directions: measured on the real panel at 25/50/75% of 300ms, `linear`
        // gives expand 6/25/56 and collapse 56/25/6. A curve that's right one way
        // is exactly wrong the other. These two are each pre-distorted so that
        // the squaring lands on out-quart in pixels — the only units anyone can
        // see. Measured: unfold 66/91/98, fold 30/5/0.
        //
        // Both are wrong for anything that isn't an fr track. Don't reuse them.
        unfold: "cubic-bezier(0.1, 0.85, 0.25, 1)",
        fold: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      keyframes: {
        // Entrance for anything the agent produces: a trace payload, the report,
        // an error. Starts from the visible end state, so if the animation never
        // runs (reduced motion, headless, hidden tab) the content is still there.
        "rise-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "none" },
        },
        // The live signal: one tempo, two materials. A solid status dot breathes
        // on opacity; the running node's ring breathes on its stroke instead, so
        // the core stays solid and the node you're watching never disappears.
        "pulse-status": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "signal-breathe": {
          "0%, 100%": { strokeOpacity: "0.35" },
          "50%": { strokeOpacity: "0.9" },
        },
        // A node finishing, in two beats: its check strokes itself in, then the
        // connector carries the run down to the next node. `pathLength="1"` on
        // the check normalizes the dash math to 0..1.
        "draw-check": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
        "draw-line": {
          from: { transform: "scaleY(0)" },
          to: { transform: "none" },
        },
        // Category bars growing to their score. clip-path rather than scaleX so
        // the pill's cap keeps its radius instead of squashing as it grows, and
        // so no layout property is animated.
        "bar-grow": {
          from: { clipPath: "inset(0 100% 0 0 round 9999px)" },
          to: { clipPath: "inset(0 0 0 0 round 9999px)" },
        },
      },
      animation: {
        "rise-in": "rise-in 240ms cubic-bezier(0.25, 1, 0.5, 1) both",
        // Both loops share one tempo and one symmetric curve — a loop on an
        // ease-out curve reads lopsided, rushing out and crawling back.
        "pulse-status": "pulse-status 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "signal-breathe":
          "signal-breathe 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "draw-check": "draw-check 280ms cubic-bezier(0.25, 1, 0.5, 1) both",
        // The 120ms delay is what makes the check and the line read as one
        // gesture rather than two things firing at once.
        "draw-line": "draw-line 360ms cubic-bezier(0.25, 1, 0.5, 1) 120ms both",
        "bar-grow": "bar-grow 440ms cubic-bezier(0.25, 1, 0.5, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
