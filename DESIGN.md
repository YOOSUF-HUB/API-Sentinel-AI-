---
name: API Sentinel AI
description: An instrument panel for API review — the agent's reasoning, shown exactly and without alarm.
colors:
  signal-cyan: "#38bdf8"
  signal-cyan-deep: "#0ea5e9"
  ink-void: "#0a0c10"
  ink-surface: "#0f1218"
  ink-raised: "#161b24"
  ink-line: "#1e2530"
  ink-edge: "#2a3340"
  severity-critical: "#ef4444"
  severity-critical-bright: "#f87171"
  severity-warning: "#f59e0b"
  severity-pass: "#22c55e"
  text-bright: "#f1f5f9"
  text-body: "#e2e8f0"
  text-secondary: "#94a3b8"
  text-muted: "#7c8ba1"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
    letterSpacing: "-0.025em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "0.025em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal-cyan}"
    textColor: "{colors.ink-void}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.signal-cyan-deep}"
  mode-preset:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  mode-preset-active:
    backgroundColor: "#38bdf81a"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  input-textarea:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  card-surface:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-critical:
    backgroundColor: "#ef444426"
    textColor: "{colors.severity-critical-bright}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-warning:
    backgroundColor: "#f59e0b26"
    textColor: "{colors.severity-warning}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-pass:
    backgroundColor: "#22c55e26"
    textColor: "{colors.severity-pass}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  dropzone:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.lg}"
    padding: "56px 24px"
---

# Design System: API Sentinel AI

## 1. Overview

**Creative North Star: "The Instrument Panel"**

This is a calibrated instrument, not a dashboard. An instrument earns trust by reporting exactly what it measures — never louder, never with flourish, never with a number inflated for effect. The visitor is here to judge the quality of the agent's reasoning, and the interface's only job is to make that reasoning legible. Confidence comes from legibility, not decoration. Every surface should feel like it was built by someone who expected to be inspected closely, because that is precisely the audience.

The system is near-black and tonal. Depth is built from a five-step ink ramp (`#0a0c10` → `#2a3340`) and hairline borders rather than shadow, and the single cyan accent is rationed hard. Type is a plain system sans at a tight scale — there is no display face and no font pairing, because a review tool has nothing to say that a well-set 14px sans can't say better. Density is moderate: roomy enough that a first-time visitor isn't repelled, tight enough that it reads as a tool rather than a brochure.

What this system rejects, in its own words: the **generic SaaS dashboard** — gradient hero metrics, identical icon-heading-text card grids, glassmorphism, big-number theater. And **security-vendor threat theater** — blood-red alerting, THREAT LEVEL gauges, fear as an aesthetic. Both are live risks here rather than abstractions: this product renders a 0–100 score and a red-amber-green severity triad, which is exactly the raw material each cliché is made from. The discipline is to report severity at the weight it is actually severe.

**Key Characteristics:**
- Near-black, tonally layered; no shadows in the current build
- One accent, rationed to state and action only
- System sans, single family, tight scale (1.125–1.33 between steps)
- Severity communicated by ranking and clarity, never by alarm
- Generous radii (8–16px) and roomy padding — approachable, not clinical
- Built to survive a close look: real focus states, real contrast, real keyboard paths

## 2. Colors

A near-black tonal ground with one rationed cyan and a three-stop severity triad — restrained by construction, since the ink ramp carries almost every surface and the accent is the only chromatic voice in the interface chrome.

### Primary

- **Signal Cyan** (`#38bdf8`, Tailwind token `accent`): The one chromatic voice. It marks live state and primary action — the running node's pulse, the focused input's ring, the active mode preset, the Start review button — and nothing else. It is never a fill, never a gradient, never a heading color.
- **Signal Cyan Deep** (`#0ea5e9`, token `accent-muted`): The hover state of the primary button only. Note this darkens on hover rather than lightening, which is a deliberate inversion against the near-black ground: the button recedes slightly under the cursor instead of glaring.

### Secondary

None. The severity triad below is semantic, not a secondary brand color, and must never be borrowed for decoration.

### Neutral

- **Void** (`#0a0c10`, token `ink-900`): The page ground. The floor of the ramp; nothing sits behind it.
- **Surface** (`#0f1218`, token `ink-800`): Cards, the header bar, inputs, the dropzone, mode presets. The workhorse — most of the interface is this color.
- **Raised** (`#161b24`, token `ink-700`): The step above Surface — stat tiles, the summary block, issue rows. Used when something needs to read as nested inside a card without a border doing the work.
- **Line** (`#1e2530`, token `ink-600`): Hairline borders, dividers, and the unfilled track of a score bar. Structural, never decorative.
- **Edge** (`#2a3340`, token `ink-500`): The dashed dropzone border and hover border states. The lightest ink step; the only one that reads as an edge rather than a surface.
The four text roles are real Tailwind tokens (`text-bright`, `text-body`, `text-secondary`, `text-muted`) rather than raw `slate-*`. There is no raw color left in the app; a `slate-*` or `red-*` utility appearing in a diff is drift, and it is how the contrast bug below got in the first time.

- **Bright** (`#f1f5f9`, token `bright`): Headings and emphasized inline values. 16.47:1 worst-case.
- **Body** (`#e2e8f0`, token `body`): Prose the user actually reads, and the `<body>` default. 14.63:1 worst-case.
- **Secondary** (`#94a3b8`, token `secondary`): Supporting prose and descriptions. 7.04:1 worst-case.
- **Muted** (`#7c8ba1`, token `muted`): The quiet tier — section labels, issue locations, step timings, placeholders. 5.21:1 worst-case.

Ratios are measured against `ink-700/50` (`rgb(19,23,30)`), the lightest surface any of them actually composite onto — not against nominal Surface, which flatters every number.

**Muted was `#64748b` and measured 3.94:1 — a real AA failure across nine sites.** It was lightened to `#7c8ba1` rather than collapsed into Secondary, so the four-step hierarchy survives at a value that passes. `#64748b` is now out of the system; don't reintroduce it.

### Severity

Severity is judged on the tint it sits on, not on Surface. Each badge lays its own 15% fill under its text, which lightens the background beneath it — the reason the ratios below are lower than a naive check against `ink-800` suggests.

- **Critical** (`#ef4444`, token `severity-critical`): The highest issue rank. 4.98:1 on Surface — the score ring and category bars use it and pass.
- **Critical Bright** (`#f87171`, token `severity-critical-bright`): Critical's *text* tone wherever it sits on its own tint. Red is far darker than amber or green at the same nominal step, so `#ef4444` on the badge lands at **4.18:1 and fails**, while Warning and Pass clear 6:1 unaided. This token exists to close that gap: **5.68:1**, back in family with the other two. Also carries the error banner's text.
- **Warning** (`#f59e0b`): The middle rank. 6.55:1 on its badge tint.
- **Pass** (`#22c55e`): A satisfied check. 6.23:1 on its badge tint.

### Named Rules

**The One Voice Rule.** Signal Cyan appears on no more than ~10% of any screen, and only to mean *live*, *focused*, *selected*, or *primary action*. Its rarity is the entire point — the moment it becomes a decorative fill, the running-node pulse stops meaning anything.

**The Earned Alarm Rule.** Severity color is issued by the scorer, never by the designer. Critical red appears on a badge and a bar and nowhere else; it may never wash a card, tint a background at full saturation, or set the page mood. If the interface looks alarming before you've read a single issue title, it is lying about the severity.

**The Ramp-Not-Shadow Rule.** Depth in the current build is a step along the ink ramp, optionally with a `Line` hairline. A nested surface goes up one step (Surface → Raised); it does not gain a shadow.

## 3. Typography

**Display Font:** None. The system deliberately has no display face.
**Body Font:** system sans (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`)
**Label/Mono Font:** system mono (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`), reserved for spec locations

**Character:** One family, several weights, a tight scale. The type has no opinion of its own — it is a clear pane of glass over the agent's reasoning, and its restraint is what lets the trace and the findings carry the personality. The system stack also renders natively on every reviewer's machine, which is the honest choice for a tool that loads once and gets judged in a minute.

### Hierarchy

- **Headline** (600, 1.5rem/2rem, -0.025em): Page titles — "Review your API documentation", "Review". One per screen.
- **Title** (600, 1.125rem/1.75rem, -0.025em): The wordmark and the report heading. The step between page and section.
- **Body** (400, 0.875rem/1.25rem): Everything the user actually reads — descriptions, issue detail, the summary narrative, trace step labels. Cap prose at 65–75ch; the report summary and page intros already sit inside a `max-w-2xl`/`max-w-5xl` measure.
- **Label** (600, 0.75rem, 0.025em, uppercase): Section markers and stat captions — "Summary", "Issues (n)", "Chunks", "Ask your own".
- **Mono** (400, 0.75rem): Spec locations on an issue (`paths./pets.get`). The only monospace in the system, and it means *this is a literal string from your document*.

### Named Rules

**The Glass Pane Rule.** Type never performs. No display face, no font pairing, no gradient text, no clamp-scaled headings. If a heading needs more presence, it gets weight or a size step — never a personality.

**The Literal Mono Rule.** Monospace means the characters came verbatim out of the user's spec. It is forbidden as a stylistic choice for labels, numbers, or "technical feel."

**The Quiet Label Rule.** The uppercase 12px label is a section marker, and the system is already close to over-using it. It earns its place where it captions a value or names a block a reader might skip to. It is not an eyebrow: never stack one above every heading as scaffolding.

## 4. Elevation

**The current build has no shadows at all, and no blurs either.** Not one `box-shadow` exists across the four components and two routes. Depth is conveyed **entirely** by tonal layering along the ink ramp (Void → Surface → Raised) plus 1px `Line` borders — with no exceptions, which is new: this document used to claim "a single `backdrop-blur` on the sticky header." The header is not sticky and never was, so that blur was filtering a flat, uniform backdrop into the identical flat colour. It has been removed rather than documented.

This is documented as **current state, not doctrine.** The flatness was not a deliberate decision, and elevation is explicitly open. If shadows are introduced later, they should be a response to state (hover, focus, overlay) rather than ambient decoration, and the first real need will likely be a dropdown or modal that has to escape the page plane. Until that decision is made deliberately, new surfaces should follow the existing tonal approach rather than inventing a shadow vocabulary ad hoc.

### Shadow Vocabulary

None defined.

**Anti-pattern test:** if a card appears to float above the page, it has broken with the rest of the system — every other surface in this build is welded flat to its ground.

## 5. Components

The character across the board is **soft and approachable**: generous radii, roomy padding, gentle transitions. The system is dark and technical, and the component shapes are what keep it from reading as clinical. Nothing here is sharp for the sake of looking like a tool.

### Buttons

- **Shape:** Generously rounded (12px, `rounded-xl`); the upload page's confirm button uses a slightly tighter 8px (`rounded-lg`) — an inconsistency, not a variant.
- **Primary:** Signal Cyan fill with Void text (`#38bdf8` on `#0a0c10`), 10px/20px padding, 14px semibold. Inverted-brightness by design: dark text on a bright accent is the loudest element on the screen, which is why there is only ever one per view.
- **Hover / Focus:** Background steps to Signal Cyan Deep (`#0ea5e9`) over ~150ms. **No `:focus-visible` ring is currently defined** — buttons rely on the browser default.
- **Disabled:** The accent is **removed**, not faded: background steps to `Raised` (`#161b24`) with `Muted` text and `cursor-not-allowed`. A disabled primary used to be Signal Cyan at opacity 0.4, which read as an enabled button behind fog and left the accent saturated underneath — the Honest Disabled Rule and the One Voice Rule pulling against each other. Unavailable is a surface, not a dimmer.

### Chips

- **Style:** Fully rounded pill (`9999px`), 2px/10px padding, 12px semibold uppercase, with a 15%-opacity severity fill, solid severity text, and a 30%-opacity severity ring. The three severities are identical in shape and differ only in hue and glyph (`✕` / `!` / `✓`).
- **State:** Static — severity is a fact, not an interaction. Chips are never clickable.

### Cards / Containers

- **Corner Style:** 16px (`rounded-2xl`) for the report container and dropzone; 12px (`rounded-xl`) for everything else.
- **Background:** Surface (`#0f1218`), stepping to Raised (`#161b24`, often at 40–50% opacity) for nested blocks.
- **Shadow Strategy:** None — see Elevation.
- **Border:** 1px `Line` (`#1e2530`). The dropzone is the exception: 2px dashed `Edge` (`#2a3340`).
- **Internal Padding:** 24px (report), 20px (panels), 16px (issue rows).

### Inputs / Fields

- **Style:** Surface fill, 1px `Line` stroke, 12px radius, 10px/14px padding, 14px Body text, non-resizable.
- **Focus:** Border shifts to Signal Cyan with a 1px cyan ring — the clearest focus treatment in the system and the model the buttons should follow.
- **Disabled:** Opacity 0.6.
- **Placeholder:** `Muted` (`#7c8ba1`, 5.41:1 on Surface) — quieter than a typed value (`Body`) so the two never read alike, but held to the same 4.5:1 as body text. It was `#475569` (2.48:1).

### Navigation

- **Style:** A single **static** top bar — opaque Surface, 1px `Line` bottom border, scrolls away with the page. Contents: wordmark only — there is no nav, because there are only two routes and the second is reached by finishing the first. It doesn't stick: a bar carrying no navigation earns no permanent viewport, least of all on mobile, and the run it would hover over is the thing the user came to watch.
- **Wordmark:** "API Sentinel **AI**" at Title size, with "AI" in Signal Cyan — the one sanctioned decorative use of the accent in the system.
- **Mobile:** Identical. Nothing collapses; there's nothing to collapse.

### The Agent Trace (signature component)

The most important component in the product, and the one that has to carry *"the trace is the product, not a loading state."* A `Surface` panel whose header is a disclosure button (`h2` — a sibling of the report's heading, not a child of it), over an ordered list of the graph's five nodes: query planner → retriever → relevance grader → analyzer → synthesizer.

**Disclosure:** open while the run works, collapsed once the report lands, and never removed — the reasoning stays available underneath its own result. User intent wins permanently once expressed.

**Step states,** each an 18px indicator in an `18px 1fr` grid with a 1px `Line` connector running between them:

- **Pending:** `Edge` ring, `Secondary` label.
- **Running:** Signal Cyan dot, pulsing, `Bright` medium label. The only cyan in the component — this is what the One Voice Rule is protecting.
- **Done:** a **neutral** check in a `Raised` disc, `Body` label. Deliberately *not* Pass green: a completed node is not a severity, and borrowing the scorer's palette for "this finished" is exactly the Earned Alarm Rule's failure mode.
- **Failed:** `Critical` ✕ on a 15% tint.

**Payloads.** Each node renders as the artifact it actually produced, never a uniform row: the planner shows the questions it wrote, the retriever its counts and section types, the grader a narrowing (`18 retrieved → 11 kept · 7 dropped below 0.50`) with the kept chunks and their scores, the analyzer its reasoning prose and what it found undocumented, the synthesizer the score. Uniform rows would flatten away the thing the component exists to show. Prose caps at `68ch`; chunk lists cap at `max-w-sm` so a location is never stranded half a viewport from its score. Mono appears only on spec locations (the Literal Mono Rule).

**Ordering constraint:** a progress event means a node *finished*, so the running node is the first one not yet heard from. The pipeline is streamed up front as its own event rather than inferred from arrivals — inferring it is what produced an off-by-one that announced a completed step as still running.

**Motion.** The trace is where the system's motion budget is actually spent, because the run's progress *is* the content. Four gestures, and the whole app draws from the same four:

- **Entrance** (`rise-in`, 240ms `out-quart`, 50ms stagger down a list). Everything the agent produces arrives this way: payloads, the panel, the report, an error. Always `motion-safe:`, always animating *up from the visible end state*, so a headless render or a reduced-motion user still gets the content.
- **Live signal** (2s `breathe`, symmetric — a loop on an ease-out curve reads lopsided). The running node's ring breathes on its stroke while the cyan core stays solid; the header dot breathes on opacity. Pulsing the whole indicator, as it once did, faded out the one node the user is actually watching.
- **Draw** — a node finishing, in two beats: its check strokes in over 280ms, then at +120ms the connector fills downward to wake the next node. The connector is the run's progress bar, which is why there isn't a separate one. Its fill is **neutral** (`Secondary`), never cyan: cyan means *live*, and a traversed edge is history. The edges below the frontier stay `Line` dark, so the spine reports exactly how far the run got — including where it failed.
- **Fold** — the disclosure only. See the Named Rule below.

The score is the one thing that deliberately **doesn't** move. Bars grow; the number is just placed. Animating a 0–100 score is big-number theater, and the motion budget belongs to the reasoning, not the metric.

A live region announces step changes independently of all of it.

### The Cold-Start Notice

The one wait the trace *can't* explain. The backend embeds in-process on a free instance that sleeps when idle, so the first request after a wake loads a ~90 MB model on a shared CPU — minutes, against seconds warm. Nothing streams that, because it happens underneath a node that hasn't reported yet. Everywhere else, the trace already answers *why is this slow* by naming the running node.

**Neutral by construction.** A `Surface` panel with a `Line` hairline, a `Bright` lead sentence and `Body` prose at a 68ch measure, arriving on `rise-in`. No severity tint — a cold start is infrastructure, not a finding, and amber here would collide with the warnings the same run is about to report about the user's spec. No cyan either: cyan means *live*, and the running node one panel down is already saying that. It is noticed because it arrives and because it is prose in a field of chrome, not because it is colored.

**Staged, because what can honestly be claimed changes with time.** Silent under 10s. At 10s it hedges — a 12s wait is anomalous but is not yet *evidence* of a cold start. At 45s it names the cause and quotes the number, because by then nothing else explains it. Asserting "a few minutes" at ten seconds would make every merely-slow run look broken.

**Scoped to the embedder.** It times the *current* wait — the run's start, or the last node to land — never total elapsed, so a run that is moving never trips it however long it takes overall. And it only speaks where the embedder is the plausible cause: before any node has landed (the instance waking), or while the retriever runs (the model loading). A slow analyzer is Groq being slow.

### Named Rules

**The One Loud Thing Rule.** Exactly one Signal Cyan primary button per view. If two elements are competing to be the obvious next action, the screen is wrong, not the button.

**The Honest Disabled Rule.** A disabled control must read as unavailable at a glance, not as an enabled control behind fog.

**The Fold-Only-When-Asked Rule.** The trace's disclosure animates when the *user* toggles it, and never on the auto-collapse when a run completes. That collapse moves ~1000px: sliding a screen and a half of finished reasoning past someone to reveal the answer they just waited for is choreography charging rent on the result. Clicking the header is a question about the panel, and the fold answers it. The run ending is a question about the report — so the panel just closes, and the report's own entrance plays in a settled layout where it can actually be seen. Before this split, the report's fade ran while it was still 1000px below the fold and nobody ever saw it.

## 6. Do's and Don'ts

### Do:

- **Do** ration Signal Cyan (`#38bdf8`) to live state, focus, selection, and the single primary action — the One Voice Rule, ≤10% of any screen.
- **Do** build depth by stepping the ink ramp (Void `#0a0c10` → Surface `#0f1218` → Raised `#161b24`) with 1px `Line` (`#1e2530`) borders, matching the current build.
- **Do** give the agent trace the design attention normally reserved for the report. It is the evidence for *shows its work*.
- **Do** copy the textarea's focus treatment (border → Signal Cyan plus a 1px cyan ring) onto every interactive element. It's the system's best state and it's currently used once.
- **Do** pair every severity color with its glyph and label (`✕ Critical`, `! Warning`, `✓ Pass`), so severity survives color-blindness and grayscale.
- **Do** hold body text to 4.5:1 against the surface it actually renders on, per PRODUCT.md's WCAG 2.2 AA commitment.
- **Do** keep transitions at 150–250ms, and name a duration *and* a curve at every call site. A bare `transition` is Tailwind's 150ms `cubic-bezier(0.4, 0, 0.2, 1)` wearing the system's clothes.
- **Do** reach for one of the four gestures (entrance / live signal / draw / fold) before inventing a fifth. They're in `tailwind.config.ts` as `rise-in`, `pulse-status` + `signal-breathe`, `draw-check` + `draw-line`, and `ease-unfold` + `ease-fold`.
- **Do** say only what is known at the moment you say it. The cold-start notice hedges at 10s and names the cause at 45s because that's when each becomes true. A UI that explains a delay with the *wrong* reason is worse than one that says nothing — it spends the trust the trace earns.
- **Do** write animations so the *end* state is the static one and the animation only hides it first — `fill: both` plus `motion-safe:`. Reduced motion, a hidden tab, and a headless render then all show finished content instead of nothing. Verify by cancelling every animation (`getAnimations().forEach(a => a.cancel())`) and checking the page is still complete.

### Don't:

- **Don't** write a raw `slate-*` or `red-*` utility. Every text color is a token (`bright` / `body` / `secondary` / `muted`, plus the severity trio). Nine AA failures got in precisely because the roles were named here but never existed in `tailwind.config.ts`, so each call site picked its own gray.
- **Don't** darken Muted back past `#7c8ba1`. It is the floor of the text ramp and it sits at 5.21:1 on the lightest surface it lands on; `#64748b` is one step down and measures 3.94:1.
- **Don't** add a `backdrop-blur` to a surface nothing scrolls under. The header carried one for a static bar — a real compositing layer filtering a flat, uniform backdrop into the identical flat colour. That's glassmorphism arrived at by accident, which is still the thing this system rejects. Blur is rare and purposeful, or nothing.
- **Don't** explain *infrastructure* with severity color. A cold start, a wake, a dropped connection: none of them are findings, and the report renders real amber warnings about the user's spec one panel down. The Earned Alarm Rule guards the scorer's palette from the designer; this is the same rule pointed at the other kind of message — reaching for amber because a notice *feels* urgent is how the triad stops meaning anything.
- **Don't** trust a timing function on `grid-template-rows`. Interpolating `0fr`↔`1fr` is linear in `fr`, but fr maps to pixels as a **square** (`height = H·f²`), so whatever curve you name gets squared before anyone sees it — `out-quart` lands as `(1-t)⁸`, a snap with a tail. The squaring is symmetric, so one curve cannot serve both directions: measured with `linear`, expand runs 6/25/56 and collapse 56/25/6. That's why `ease-unfold` and `ease-fold` are separate, pre-distorted, and used nowhere else. Measure the pixels, not the curve.
- **Don't** check contrast against the nominal surface. Composite the whole ancestor chain first, alpha included. The Critical badge reads as `#ef4444` on `ink-800` (4.98:1, fine) and is actually `#ef4444` on `rgb(51,29,35)` (4.18:1, failing) because its own 15% tint sits between. Every ratio in this document was measured in a browser for that reason.
- **Don't** build a **generic SaaS dashboard**: no gradient hero metric, no identical icon-heading-text card grids, no glassmorphism, no **big-number theater**. Audit test: the 80px score ring is one gradient and one supporting-stat row away from being the exact cliché PRODUCT.md rejects. If the number is the most designed thing on the page, the reasoning that produced it has been demoted.
- **Don't** drift into **security-vendor threat theater**: no blood-red alerting, no THREAT LEVEL gauges, no fear as an aesthetic. Audit test: if a low score makes the page *feel* dangerous rather than *report* that it's low, back the color out.
- **Don't** nest a card inside a card. The report container currently holds a bordered summary block and bordered issue rows — both are nested cards, and nested cards are always wrong. Use a tonal step to Raised, or a hairline divider, or nothing.
- **Don't** use `background-clip: text` with a gradient. Ever. Weight and size carry emphasis.
- **Don't** use a `border-left`/`border-right` over 1px as a colored severity stripe on issue rows. It's the obvious next move for severity and it's banned — the badge already does that job.
- **Don't** introduce a second font family or a display face. The Glass Pane Rule: type never performs.
- **Don't** let the uppercase 12px label become an eyebrow above every section. It captions values and names skippable blocks; it is not scaffolding.
- **Don't** reach for a modal. There are two routes and one flow; anything that wants a modal wants to be inline.
