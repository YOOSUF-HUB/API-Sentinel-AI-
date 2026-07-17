# Product

## Register

product

## Platform

web

## Users

The primary audience is people evaluating the project and the engineer behind it — recruiters, hiring managers, and engineers who open the live deployment, run a spec through it, and form a judgment. They arrive curious rather than task-driven. Their job to be done is assessment: they want to understand what this is and how good it is, quickly, and they will look closely at the craft because looking closely is the point of their visit.

Real API and backend engineers running their own specs are a **future** audience, not a current one. Today the traffic is evaluative; the intent is a genuine tool. Design decisions should not paint the product into a demo-only corner — anything that only works for a single staged run-through, or that assumes an audience who will never return, is a trap.

## Product Purpose

API Sentinel AI reviews API documentation the way a senior technical reviewer would. A user uploads an OpenAPI spec, text, Markdown, or PDF; the system ingests it into a vector store and runs a five-node LangGraph agent (plan → retrieve → grade → analyze → synthesize) that surfaces security, documentation, and best-practice issues as a scored, severity-tagged report.

Success is that the visitor comes away impressed by the agent's reasoning. Not by the score, and not by the speed — by the visible quality of the thinking that produced the result. If someone watches a review run and concludes the analysis is shallow or the interface is hiding a thin process behind a progress bar, the product has failed even when the report is correct.

## Positioning

It shows its work. You watch the agent plan, retrieve, grade, and analyze in real time — the reasoning is visible, not a black box.

## Brand Personality

Precise, transparent, unhurried. Instrument-grade: it shows its reasoning calmly and exactly, and its confidence comes from legibility rather than flourish. The voice is plain and technical, engineer to engineer, without hype or hedging. It never rushes the user through the interesting part, and it never performs certainty it hasn't earned.

Two references, each for a specific reason. **Stripe docs** for legibility — dense technical content that stays readable, with typography and hierarchy doing all the work and no ornament. **GitHub Actions' run log** for the trace — a live pipeline of named steps you watch complete, which is the closest existing thing to *shows its work*.

## Anti-references

Not a generic SaaS dashboard: no gradient hero metric, no identical icon-heading-text card grids, no glassmorphism, no big-number theater. That's the default every AI-built dashboard collapses into.

Not security-vendor threat theater: no blood-red alerting, no THREAT LEVEL gauges, no fear as an aesthetic. Manufactured urgency is the opposite of earned trust, and this product's severity vocabulary is especially prone to sliding into it.

## Design Principles

**The trace is the product, not a loading state.** The agent's five nodes are the strongest evidence for the central claim. Treating that sequence as a spinner with extra words throws away the thing the visitor came to see. It deserves the design attention normally reserved for the result.

**Trust is earned through legibility.** Every claim the report makes should be inspectable: which part of the spec it came from, how severe it is, why the number is what it is. Where a choice exists between explaining and asserting, explain.

**Severity without theater.** Report what's wrong at the weight it's actually wrong. Criticality is communicated by clarity and ranking, never by alarm.

**Unhurried precision.** Calm is a feature. The interface should never hurry the user past the reasoning, and should never simulate urgency to feel alive.

**Built for the second look.** This audience inspects. They will open devtools, read the markup, resize the window, and tab through the form. Craft has to survive scrutiny, because scrutiny is the actual use case.

## Accessibility & Inclusion

WCAG 2.2 AA. Body text at 4.5:1 or better against its background, visible focus states on every interactive element, full keyboard operability, and a reduced-motion alternative for every animation. The severity palette (critical / warning / pass) carries the highest risk here and must meet contrast on the surfaces where it actually renders.
