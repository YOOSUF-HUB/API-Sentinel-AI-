"""FastAPI application surface for API Sentinel AI.

Thin HTTP layer over the ingestion pipeline (rag/pipeline.py) and the review
agent (agents/sentinel_agent.py). All heavy lifting lives in those modules; the
routes here only validate input, call them, and shape responses.

Endpoints:
    POST   /upload            multipart file -> ingest -> UploadResponse
    POST   /review            {doc_id, question, mode} -> streamed NDJSON events
    GET    /report/{doc_id}    one-shot scored Report (mode via ?mode=)
    DELETE /document/{doc_id}  remove all chunks for a document
"""
from __future__ import annotations

import json
from contextlib import asynccontextmanager
from typing import Iterator

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents import sentinel_agent
from config import settings
from models.schemas import (
    DeleteResponse,
    Report,
    ReviewMode,
    ReviewRequest,
    UploadResponse,
)
from rag import pipeline

# A default comprehensive question used by GET /report when none is supplied.
_DEFAULT_REPORT_QUESTION = (
    "Perform a thorough review of this API documentation. Identify security "
    "weaknesses, documentation gaps, missing details, and best-practice "
    "violations, and assess overall production readiness."
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast on missing secrets when the server actually starts.
    settings.require()
    yield


app = FastAPI(title="API Sentinel AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
@app.post("/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    """Ingest an API document: parse -> chunk -> embed -> store."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file with a name is required.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        doc_id, chunks = pipeline.ingest(file.filename, data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - surfaced as 500 to the client
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}") from exc

    section_types = sorted({c.section_type for c in chunks})
    return UploadResponse(
        doc_id=doc_id,
        file_name=file.filename,
        chunk_count=len(chunks),
        section_types=section_types,
    )


# ---------------------------------------------------------------------------
# Review (streaming)
# ---------------------------------------------------------------------------
@app.post("/review")
def review(request: ReviewRequest) -> StreamingResponse:
    """Run the review agent and stream progress + the final report as NDJSON.

    Each line of the response body is a JSON object:
        {"type": "progress", "node": "...", "label": "..."}
        {"type": "report", "report": {...}}
        {"type": "error", "detail": "..."}
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="A question is required.")

    def event_stream() -> Iterator[str]:
        try:
            for event in sentinel_agent.stream(
                question=request.question,
                doc_id=request.doc_id,
                mode=request.mode.value,
            ):
                yield json.dumps(event) + "\n"
        except Exception as exc:  # pragma: no cover - streamed error to client
            yield json.dumps({"type": "error", "detail": str(exc)}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


# ---------------------------------------------------------------------------
# Report (one-shot)
# ---------------------------------------------------------------------------
@app.get("/report/{doc_id}", response_model=Report)
def report(
    doc_id: str,
    mode: ReviewMode = Query(default=ReviewMode.PRODUCTION),
) -> Report:
    """Run a one-shot comprehensive review and return the scored Report."""
    try:
        return sentinel_agent.run(
            question=_DEFAULT_REPORT_QUESTION,
            doc_id=doc_id,
            mode=mode.value,
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Review failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------
@app.delete("/document/{doc_id}", response_model=DeleteResponse)
def delete_document(doc_id: str) -> DeleteResponse:
    """Delete all chunks for a document."""
    deleted = pipeline.delete_document(doc_id)
    return DeleteResponse(deleted=deleted, doc_id=doc_id)
