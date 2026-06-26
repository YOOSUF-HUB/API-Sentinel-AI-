"""LLM-backed building blocks for the Sentinel review agent.

Each function here is a single, independently-testable unit of reasoning that the
LangGraph nodes in `sentinel_agent.py` orchestrate:

    plan_queries     -> break a question into focused sub-questions
    grade_relevance  -> score retrieved chunks 0-1 and drop the irrelevant ones
    analyze          -> reason over the kept chunks; surface issues + gaps
    synthesize       -> fold everything into a structured, scored Report

All Groq calls go through the small `_complete_json` / `_complete_text` helpers so
JSON parsing, temperature, and model selection live in one place.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from config import get_groq, settings
from models.schemas import (
    CategoryScores,
    Issue,
    Report,
    RetrievedChunk,
    Severity,
)

# ---------------------------------------------------------------------------
# Mode framing
# ---------------------------------------------------------------------------
# Each review mode steers the agent's focus. CUSTOM lets the user's raw question
# drive everything with no extra lens.
_MODE_FOCUS: Dict[str, str] = {
    "security": (
        "Focus on authentication, authorization, transport security (HTTPS), "
        "secrets handling, rate limiting, injection surfaces, and missing "
        "security schemes."
    ),
    "documentation": (
        "Focus on documentation quality: missing descriptions, undocumented "
        "parameters and responses, unclear examples, and inconsistent naming."
    ),
    "production": (
        "Focus on production readiness: error handling, status codes, "
        "versioning, pagination, rate limiting, deprecation, and observability."
    ),
    "data_exposure": (
        "Focus on data exposure: endpoints returning PII or sensitive fields, "
        "over-broad schemas, lack of field-level access control, and verbose "
        "error payloads that leak internals."
    ),
    "custom": "Answer the user's question directly using the provided context.",
}


def _mode_focus(mode: str) -> str:
    return _MODE_FOCUS.get(mode, _MODE_FOCUS["custom"])


# ---------------------------------------------------------------------------
# Groq helpers
# ---------------------------------------------------------------------------
def _complete_json(system: str, user: str, temperature: float = 0.1) -> Any:
    """Call Groq in JSON mode and return the parsed object.

    Falls back to an empty dict if the model returns something unparseable, so a
    single bad completion never crashes the graph.
    """
    client = get_groq()
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    raw = response.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _complete_text(system: str, user: str, temperature: float = 0.2) -> str:
    client = get_groq()
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def _format_chunks(chunks: List[RetrievedChunk]) -> str:
    """Render chunks into a numbered context block for prompting."""
    parts: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        location = chunk.endpoint_path or chunk.section_type
        parts.append(f"[{i}] ({chunk.section_type} | {location})\n{chunk.content}")
    return "\n\n".join(parts) if parts else "(no relevant context found)"


# ---------------------------------------------------------------------------
# Node 1: query planner
# ---------------------------------------------------------------------------
def plan_queries(question: str, mode: str) -> List[str]:
    """Break a high-level question into 2-4 focused retrieval sub-questions."""
    system = (
        "You are a senior API reviewer planning a document search. "
        "Break the user's request into 2 to 4 specific, self-contained "
        "sub-questions that together cover what must be retrieved from the API "
        "documentation to answer well. "
        f"{_mode_focus(mode)} "
        'Respond as JSON: {"sub_questions": ["...", "..."]}.'
    )
    user = f"Review mode: {mode}\nUser request: {question}"
    data = _complete_json(system, user)
    subs = data.get("sub_questions") if isinstance(data, dict) else None

    cleaned = [s.strip() for s in subs] if isinstance(subs, list) else []
    cleaned = [s for s in cleaned if s]
    # Always keep the original question as a fallback / anchor.
    if not cleaned:
        return [question]
    return cleaned[:4]


# ---------------------------------------------------------------------------
# Node 3: relevance grader
# ---------------------------------------------------------------------------
def grade_relevance(question: str, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
    """Score each chunk's relevance to the question 0-1; drop those below the
    threshold. Mutates and returns the kept chunks (with .relevance set)."""
    if not chunks:
        return []

    system = (
        "You grade how relevant each numbered context snippet is to answering "
        "the user's question about an API. Score each from 0.0 (irrelevant) to "
        "1.0 (directly relevant). "
        'Respond as JSON: {"scores": [{"index": 1, "relevance": 0.0}, ...]} '
        "with one entry per snippet."
    )
    user = f"Question: {question}\n\nSnippets:\n{_format_chunks(chunks)}"
    data = _complete_json(system, user)

    scores: Dict[int, float] = {}
    if isinstance(data, dict):
        for item in data.get("scores", []) or []:
            try:
                idx = int(item["index"])
                scores[idx] = float(item["relevance"])
            except (KeyError, TypeError, ValueError):
                continue

    kept: List[RetrievedChunk] = []
    for i, chunk in enumerate(chunks, start=1):
        # Default to the cosine similarity if the grader skipped this snippet.
        chunk.relevance = scores.get(i, chunk.similarity)
        if chunk.relevance >= settings.RELEVANCE_THRESHOLD:
            kept.append(chunk)

    kept.sort(key=lambda c: c.relevance, reverse=True)
    return kept


# ---------------------------------------------------------------------------
# Node 4: analyzer
# ---------------------------------------------------------------------------
def analyze(question: str, mode: str, chunks: List[RetrievedChunk]) -> Dict[str, Any]:
    """Reason over the graded chunks: surface concrete issues and what is missing.

    Returns {"issues": [Issue...], "missing": [str...], "reasoning": str}.
    """
    system = (
        "You are a senior API documentation reviewer. Analyze the provided "
        "context and identify concrete problems. "
        f"{_mode_focus(mode)} "
        "Distinguish between problems that ARE present in the context and "
        "important things that are MISSING (not documented at all). "
        "For each issue assign a severity: CRITICAL (security/data risk or "
        "broken contract), WARNING (quality/best-practice gap), or PASS "
        "(something done correctly worth noting). "
        "Respond as JSON: "
        '{"reasoning": "...", '
        '"issues": [{"severity": "CRITICAL|WARNING|PASS", "title": "...", '
        '"detail": "...", "location": "endpoint or section or null"}], '
        '"missing": ["..."]}'
    )
    user = (
        f"Review mode: {mode}\nUser question: {question}\n\n"
        f"Context:\n{_format_chunks(chunks)}"
    )
    data = _complete_json(system, user, temperature=0.2)
    if not isinstance(data, dict):
        data = {}

    issues = _parse_issues(data.get("issues", []))
    missing = [str(m).strip() for m in (data.get("missing") or []) if str(m).strip()]
    reasoning = str(data.get("reasoning", "")).strip()
    return {"issues": issues, "missing": missing, "reasoning": reasoning}


def _parse_issues(raw: Any) -> List[Issue]:
    issues: List[Issue] = []
    if not isinstance(raw, list):
        return issues
    for item in raw:
        if not isinstance(item, dict):
            continue
        sev = str(item.get("severity", "WARNING")).upper()
        try:
            severity = Severity(sev)
        except ValueError:
            severity = Severity.WARNING
        title = str(item.get("title", "")).strip()
        detail = str(item.get("detail", "")).strip()
        if not title:
            continue
        location = item.get("location")
        location = str(location).strip() if location else None
        issues.append(
            Issue(severity=severity, title=title, detail=detail, location=location)
        )
    return issues


# ---------------------------------------------------------------------------
# Node 5: synthesizer
# ---------------------------------------------------------------------------
def synthesize(
    question: str,
    mode: str,
    doc_id: str,
    file_name: str,
    chunks: List[RetrievedChunk],
    analysis: Dict[str, Any],
) -> Report:
    """Combine analysis into a scored Report with a human-readable summary."""
    issues: List[Issue] = analysis.get("issues", [])
    missing: List[str] = analysis.get("missing", [])

    summary = _write_summary(question, mode, issues, missing, chunks)
    scores = _score(issues, missing, chunks)
    overall = round(
        (scores.security + scores.documentation + scores.completeness + scores.best_practices)
        / 4
    )

    return Report(
        doc_id=doc_id,
        file_name=file_name,
        overall_score=overall,
        category_scores=scores,
        issues=issues,
        summary=summary,
    )


def _write_summary(
    question: str,
    mode: str,
    issues: List[Issue],
    missing: List[str],
    chunks: List[RetrievedChunk],
) -> str:
    issue_lines = "\n".join(
        f"- [{i.severity.value}] {i.title}: {i.detail}"
        + (f" (at {i.location})" if i.location else "")
        for i in issues
    ) or "(none identified)"
    missing_lines = "\n".join(f"- {m}" for m in missing) or "(nothing notable)"

    system = (
        "You are a senior API reviewer writing the narrative summary of a "
        "review. Be direct and specific. Reference concrete endpoints/fields "
        "where relevant. Write 2-4 short paragraphs in Markdown. Do not invent "
        "facts beyond the issues and context provided."
    )
    user = (
        f"Review mode: {mode}\nUser question: {question}\n\n"
        f"Identified issues:\n{issue_lines}\n\n"
        f"Missing / undocumented:\n{missing_lines}\n\n"
        f"Supporting context:\n{_format_chunks(chunks)}"
    )
    return _complete_text(system, user)


def _score(
    issues: List[Issue],
    missing: List[str],
    chunks: List[RetrievedChunk],
) -> CategoryScores:
    """Deterministic 0-100 scoring derived from issue severity and gaps.

    Kept rule-based (not LLM) so scores are stable and reproducible across runs.
    Each category starts at 100 and loses points per relevant issue.
    """
    security = documentation = completeness = best_practices = 100

    crit_penalty = 25
    warn_penalty = 8

    for issue in issues:
        penalty = crit_penalty if issue.severity == Severity.CRITICAL else (
            warn_penalty if issue.severity == Severity.WARNING else 0
        )
        if penalty == 0:
            continue
        # Route the penalty to the most relevant category by keyword.
        text = f"{issue.title} {issue.detail}".lower()
        if any(k in text for k in ("auth", "secur", "https", "token", "secret", "inject", "expos", "pii")):
            security -= penalty
        elif any(k in text for k in ("describ", "document", "example", "unclear", "naming")):
            documentation -= penalty
        elif any(k in text for k in ("missing", "response", "schema", "status code", "pagination")):
            completeness -= penalty
        else:
            best_practices -= penalty

    # Each undocumented gap is a small completeness hit.
    completeness -= min(len(missing) * 5, 40)

    clamp = lambda v: max(0, min(100, v))
    return CategoryScores(
        security=clamp(security),
        documentation=clamp(documentation),
        completeness=clamp(completeness),
        best_practices=clamp(best_practices),
    )
