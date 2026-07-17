"""The Sentinel review agent: a 5-node LangGraph over an API document.

Pipeline (each node is a pure-ish state transform):

    query_planner  -> split the question into focused sub-questions
    retriever      -> cosine-search the doc for each sub-question (top-K each)
    relevance_grader -> LLM-grade chunks 0-1, drop those below the threshold
    analyzer       -> reason over kept chunks; surface issues + gaps
    synthesizer    -> fold into a scored Report with a narrative summary

`run()` executes the whole graph and returns a Report. `stream()` yields
per-node progress events followed by the final report, for the streaming
/review endpoint.
"""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, Iterator, List, Optional, TypedDict

from langgraph.graph import END, StateGraph

from agents import tools
from config import settings
from models.schemas import Report, RetrievedChunk
from rag.retriever import retrieve


class AgentState(TypedDict, total=False):
    """Mutable state threaded through the graph."""

    # Inputs
    question: str
    doc_id: str
    file_name: str
    mode: str

    # Working state
    sub_questions: List[str]
    retrieved: List[RetrievedChunk]
    graded: List[RetrievedChunk]
    analysis: Dict[str, Any]

    # Output
    report: Report


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------
def _query_planner(state: AgentState) -> AgentState:
    sub_questions = tools.plan_queries(state["question"], state["mode"])
    return {"sub_questions": sub_questions}


def _retriever(state: AgentState) -> AgentState:
    doc_id = state["doc_id"]
    seen: set[str] = set()
    merged: List[RetrievedChunk] = []
    for sub in state["sub_questions"]:
        for chunk in retrieve(sub, doc_id=doc_id, top_k=settings.TOP_K):
            key = chunk.content
            if key in seen:
                continue
            seen.add(key)
            merged.append(chunk)
    return {"retrieved": merged}


def _relevance_grader(state: AgentState) -> AgentState:
    graded = tools.grade_relevance(state["question"], state.get("retrieved", []))
    return {"graded": graded}


def _analyzer(state: AgentState) -> AgentState:
    analysis = tools.analyze(
        state["question"], state["mode"], state.get("graded", [])
    )
    return {"analysis": analysis}


def _synthesizer(state: AgentState) -> AgentState:
    report = tools.synthesize(
        question=state["question"],
        mode=state["mode"],
        doc_id=state["doc_id"],
        file_name=state["file_name"],
        chunks=state.get("graded", []),
        analysis=state.get("analysis", {}),
    )
    return {"report": report}


# ---------------------------------------------------------------------------
# Graph assembly (compiled once, module-level)
# ---------------------------------------------------------------------------
def _build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("query_planner", _query_planner)
    graph.add_node("retriever", _retriever)
    graph.add_node("relevance_grader", _relevance_grader)
    graph.add_node("analyzer", _analyzer)
    graph.add_node("synthesizer", _synthesizer)

    graph.set_entry_point("query_planner")
    graph.add_edge("query_planner", "retriever")
    graph.add_edge("retriever", "relevance_grader")
    graph.add_edge("relevance_grader", "analyzer")
    graph.add_edge("analyzer", "synthesizer")
    graph.add_edge("synthesizer", END)
    return graph.compile()


_GRAPH = _build_graph()

# The graph's linear node order, with human-readable labels. Streamed up front as
# a `pipeline` event so the client can render every step before any of them runs,
# and so the node order lives here rather than being duplicated in the frontend.
_PIPELINE: List[Dict[str, str]] = [
    {"node": "query_planner", "label": "Planning sub-questions"},
    {"node": "retriever", "label": "Retrieving relevant sections"},
    {"node": "relevance_grader", "label": "Grading relevance"},
    {"node": "analyzer", "label": "Analyzing for issues"},
    {"node": "synthesizer", "label": "Synthesizing report"},
]

_NODE_LABELS = {step["node"]: step["label"] for step in _PIPELINE}


# ---------------------------------------------------------------------------
# Progress detail
# ---------------------------------------------------------------------------
# Each node already computes far more than "it finished": the planner's actual
# sub-questions, the grader's kept/dropped split, the analyzer's reasoning. The
# builders below lift that out of the state delta and onto the progress event so
# the UI can show the agent's work instead of a spinner. No extra LLM calls; this
# is data that would otherwise be discarded.
def _planner_detail(partial: Dict[str, Any]) -> Dict[str, Any]:
    return {"sub_questions": list(partial.get("sub_questions") or [])}


def _retriever_detail(partial: Dict[str, Any]) -> Dict[str, Any]:
    chunks: List[RetrievedChunk] = partial.get("retrieved") or []
    return {
        "retrieved": len(chunks),
        "section_types": sorted({c.section_type for c in chunks}),
        "top_similarity": round(max((c.similarity for c in chunks), default=0.0), 3),
        "top_k": settings.TOP_K,
    }


def _grader_detail(partial: Dict[str, Any], retrieved_count: int) -> Dict[str, Any]:
    kept: List[RetrievedChunk] = partial.get("graded") or []
    return {
        "retrieved": retrieved_count,
        "kept": len(kept),
        "dropped": max(retrieved_count - len(kept), 0),
        "threshold": settings.RELEVANCE_THRESHOLD,
        # Locations only — never chunk content, which would bloat the stream.
        "kept_chunks": [
            {
                "location": c.endpoint_path or c.section_type,
                "section_type": c.section_type,
                "relevance": round(c.relevance, 3),
            }
            for c in kept
        ],
    }


def _analyzer_detail(partial: Dict[str, Any]) -> Dict[str, Any]:
    analysis: Dict[str, Any] = partial.get("analysis") or {}
    issues = analysis.get("issues") or []
    counts = Counter(i.severity.value for i in issues)
    return {
        "reasoning": analysis.get("reasoning", ""),
        "missing": list(analysis.get("missing") or []),
        "issue_count": len(issues),
        "severity_counts": {
            "CRITICAL": counts.get("CRITICAL", 0),
            "WARNING": counts.get("WARNING", 0),
            "PASS": counts.get("PASS", 0),
        },
    }


def _synthesizer_detail(partial: Dict[str, Any]) -> Dict[str, Any]:
    report: Optional[Report] = partial.get("report")
    return {"overall_score": report.overall_score} if report is not None else {}


def _detail_for(
    node: str, partial: Dict[str, Any], retrieved_count: int
) -> Dict[str, Any]:
    """Build a node's progress detail. Never raises: the trace is reporting on the
    review, and a malformed detail must not take the review down with it."""
    try:
        if node == "query_planner":
            return _planner_detail(partial)
        if node == "retriever":
            return _retriever_detail(partial)
        if node == "relevance_grader":
            return _grader_detail(partial, retrieved_count)
        if node == "analyzer":
            return _analyzer_detail(partial)
        if node == "synthesizer":
            return _synthesizer_detail(partial)
    except Exception:  # pragma: no cover - detail is decoration over real work
        return {}
    return {}


def _initial_state(
    question: str, doc_id: str, file_name: str, mode: str
) -> AgentState:
    return {
        "question": question,
        "doc_id": doc_id,
        "file_name": file_name,
        "mode": mode,
    }


def run(
    question: str,
    doc_id: str,
    file_name: str = "",
    mode: str = "custom",
) -> Report:
    """Run the full graph and return the final Report."""
    final = _GRAPH.invoke(_initial_state(question, doc_id, file_name, mode))
    return final["report"]


def stream(
    question: str,
    doc_id: str,
    file_name: str = "",
    mode: str = "custom",
) -> Iterator[Dict[str, Any]]:
    """Yield the pipeline shape, then progress per node, then the final report.

    Events:
        {"type": "pipeline", "nodes": [{"node": ..., "label": ...}, ...]}
        {"type": "progress", "node": ..., "label": ..., "detail": {...}}
        {"type": "report", "report": <Report dict>}

    A progress event means the named node has *completed* — `stream_mode="updates"`
    emits after a node runs. The pipeline event lets the client work out which node
    is running now (the next one) rather than mislabelling a finished node as live.
    """
    yield {"type": "pipeline", "nodes": [dict(step) for step in _PIPELINE]}

    report: Optional[Report] = None
    retrieved_count = 0

    for update in _GRAPH.stream(
        _initial_state(question, doc_id, file_name, mode), stream_mode="updates"
    ):
        for node, partial in update.items():
            if not isinstance(partial, dict):
                partial = {}
            if node == "retriever":
                # The grader only reports what it kept; the pre-filter count has to
                # be carried over from the retriever to show the narrowing.
                retrieved_count = len(partial.get("retrieved") or [])

            yield {
                "type": "progress",
                "node": node,
                "label": _NODE_LABELS.get(node, node),
                "detail": _detail_for(node, partial, retrieved_count),
            }
            if "report" in partial:
                report = partial["report"]

    if report is not None:
        yield {"type": "report", "report": report.model_dump()}
