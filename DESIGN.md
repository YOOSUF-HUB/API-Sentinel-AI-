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
  severity-warning: "#f59e0b"
  severity-pass: "#22c55e"
  text-bright: "#f1f5f9"
  text-body: "#e2e8f0"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
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
    textColor: "{colors.severity-critical}"
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
- **Bright** (`#f1f5f9`): Headings and emphasized inline values.
- **Body** (`#e2e8f0`): Default body text, set on `<body>`.
- **Secondary** (`#94a3b8`): Supporting prose and descriptions. Measures 7.31:1 on Surface — comfortably AA.
- **Muted** (`#64748b`): Currently carries small labels and issue locations. **This color fails AA at body size** (see Do's and Don'ts).

### Severity

- **Critical** (`#ef4444`): The highest issue rank. 4.98:1 on Surface — passes AA, with little margin.
- **Warning** (`#f59e0b`): The middle rank. 8.73:1 on Surface.
- **Pass** (`#22c55e`): A satisfied check. 8.23:1 on Surface.

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

**The current build has no shadows at all.** Not one `box-shadow` exists across the four components and two routes. Depth is conveyed entirely by tonal layering along the ink ramp (Void → Surface → Raised) plus 1px `Line` borders, with a single `backdrop-blur` on the sticky header.

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
- **Disabled:** Opacity 0.4 with `cursor-not-allowed`. The accent stays saturated underneath, which is the one place the system currently breaks the "no full-saturation accent on inactive states" convention.

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
- **Placeholder:** Currently `#475569`. **Fails AA badly** (see Do's and Don'ts).

### Navigation

- **Style:** A single sticky top bar, 1px `Line` bottom border, Surface at 70% opacity with `backdrop-blur`. Contents: wordmark only — there is no nav, because there are only two routes and the second is reached by finishing the first.
- **Wordmark:** "API Sentinel **AI**" at Title size, with "AI" in Signal Cyan — the one sanctioned decorative use of the accent in the system.
- **Mobile:** Identical. Nothing collapses; there's nothing to collapse.

### The Agent Trace (signature component)

The most important component in the product and currently the least designed. An ordered list of named nodes (query planner → retriever → relevance grader → analyzer → synthesizer), each a 14px Secondary label preceded by a status glyph: `◌` in Signal Cyan while running, `✓` in Pass green once complete. Steps append live as NDJSON events arrive. A 2px Signal Cyan dot pulses beside "Running agent…" while the stream is open.

PRODUCT.md is explicit that *"the trace is the product, not a loading state"* — this is the evidence for the entire positioning claim. Its present form is a four-line checklist, which is the single largest gap between the strategy and the build.

### Named Rules

**The One Loud Thing Rule.** Exactly one Signal Cyan primary button per view. If two elements are competing to be the obvious next action, the screen is wrong, not the button.

**The Honest Disabled Rule.** A disabled control must read as unavailable at a glance, not as an enabled control behind fog.

## 6. Do's and Don'ts

### Do:

- **Do** ration Signal Cyan (`#38bdf8`) to live state, focus, selection, and the single primary action — the One Voice Rule, ≤10% of any screen.
- **Do** build depth by stepping the ink ramp (Void `#0a0c10` → Surface `#0f1218` → Raised `#161b24`) with 1px `Line` (`#1e2530`) borders, matching the current build.
- **Do** give the agent trace the design attention normally reserved for the report. It is the evidence for *shows its work*.
- **Do** copy the textarea's focus treatment (border → Signal Cyan plus a 1px cyan ring) onto every interactive element. It's the system's best state and it's currently used once.
- **Do** pair every severity color with its glyph and label (`✕ Critical`, `! Warning`, `✓ Pass`), so severity survives color-blindness and grayscale.
- **Do** hold body text to 4.5:1 against the surface it actually renders on, per PRODUCT.md's WCAG 2.2 AA commitment.
- **Do** keep transitions at 150–250ms and give every animation — including the running pulse — a `prefers-reduced-motion: reduce` alternative. None currently exists.

### Don't:

- **Don't** set body-size text in Muted (`#64748b`) on Surface (`#0f1218`). Measured: **3.94:1 — fails AA.** It currently carries issue locations and stat captions. Darken the surface or lighten the text toward Secondary (`#94a3b8`, 7.31:1).
- **Don't** ship the placeholder at `#475569` on Surface. Measured: **2.48:1 — fails badly.** Placeholders need the same 4.5:1 as body text.
- **Don't** build a **generic SaaS dashboard**: no gradient hero metric, no identical icon-heading-text card grids, no glassmorphism, no **big-number theater**. Audit test: the 80px score ring is one gradient and one supporting-stat row away from being the exact cliché PRODUCT.md rejects. If the number is the most designed thing on the page, the reasoning that produced it has been demoted.
- **Don't** drift into **security-vendor threat theater**: no blood-red alerting, no THREAT LEVEL gauges, no fear as an aesthetic. Audit test: if a low score makes the page *feel* dangerous rather than *report* that it's low, back the color out.
- **Don't** nest a card inside a card. The report container currently holds a bordered summary block and bordered issue rows — both are nested cards, and nested cards are always wrong. Use a tonal step to Raised, or a hairline divider, or nothing.
- **Don't** use `background-clip: text` with a gradient. Ever. Weight and size carry emphasis.
- **Don't** use a `border-left`/`border-right` over 1px as a colored severity stripe on issue rows. It's the obvious next move for severity and it's banned — the badge already does that job.
- **Don't** introduce a second font family or a display face. The Glass Pane Rule: type never performs.
- **Don't** let the uppercase 12px label become an eyebrow above every section. It captions values and names skippable blocks; it is not scaffolding.
- **Don't** reach for a modal. There are two routes and one flow; anything that wants a modal wants to be inline.
