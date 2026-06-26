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

# Human-readable labels for streamed progress events.
_NODE_LABELS = {
    "query_planner": "Planning sub-questions",
    "retriever": "Retrieving relevant sections",
    "relevance_grader": "Grading relevance",
    "analyzer": "Analyzing for issues",
    "synthesizer": "Synthesizing report",
}


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
    """Yield progress events as each node completes, then the final report.

    Each event is a dict: {"type": "progress", "node": ..., "label": ...} or
    {"type": "report", "report": <Report dict>}.
    """
    report: Optional[Report] = None
    for update in _GRAPH.stream(
        _initial_state(question, doc_id, file_name, mode), stream_mode="updates"
    ):
        for node, partial in update.items():
            yield {
                "type": "progress",
                "node": node,
                "label": _NODE_LABELS.get(node, node),
            }
            if isinstance(partial, dict) and "report" in partial:
                report = partial["report"]

    if report is not None:
        yield {"type": "report", "report": report.model_dump()}
