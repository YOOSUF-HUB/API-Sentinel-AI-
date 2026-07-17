# CLAUDE.md

## Design Context

Design decisions for this project are governed by two root files. Read them before changing anything under `frontend/`.

- **[PRODUCT.md](PRODUCT.md)** — strategy: register, users, purpose, positioning, principles, accessibility.
- **[DESIGN.md](DESIGN.md)** — the visual system: tokens, color roles, typography, components, do's and don'ts. Machine-readable tokens live in its YAML frontmatter; `.impeccable/design.json` carries the extensions (tonal ramps, motion, component snippets).

**Register:** product · **Platform:** web

**Positioning:** It shows its work. You watch the agent plan, retrieve, grade, and analyze in real time — the reasoning is visible, not a black box.

**The five principles:**

1. **The trace is the product, not a loading state.** The agent's five nodes are the strongest evidence for the central claim; they deserve the design attention normally reserved for the result.
2. **Trust is earned through legibility.** Every claim the report makes should be inspectable. Where a choice exists between explaining and asserting, explain.
3. **Severity without theater.** Report what's wrong at the weight it's actually wrong. Criticality comes from clarity and ranking, never alarm.
4. **Unhurried precision.** Calm is a feature. Never hurry the user past the reasoning; never simulate urgency.
5. **Built for the second look.** This audience inspects — devtools, markup, resize, tab order. Craft has to survive scrutiny, because scrutiny is the use case.

**Non-negotiables:** WCAG 2.2 AA. Not a generic SaaS dashboard (no gradient hero metric, identical card grids, glassmorphism, big-number theater). Not security-vendor threat theater (no blood-red alerting, THREAT LEVEL gauges, fear as aesthetic).
