"""Pydantic models shared across the API and agent layers."""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    PASS = "PASS"


class ReviewMode(str, Enum):
    SECURITY = "security"
    DOCUMENTATION = "documentation"
    PRODUCTION = "production"
    DATA_EXPOSURE = "data_exposure"
    CUSTOM = "custom"


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------
class Chunk(BaseModel):
    """A single embeddable unit of an API document."""

    content: str
    section_type: str = "general"  # e.g. endpoint, schema, auth, info, text
    endpoint_path: Optional[str] = None


class UploadResponse(BaseModel):
    doc_id: str
    file_name: str
    chunk_count: int
    section_types: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Review / agent IO
# ---------------------------------------------------------------------------
class ReviewRequest(BaseModel):
    doc_id: str
    question: str
    mode: ReviewMode = ReviewMode.CUSTOM


class RetrievedChunk(BaseModel):
    content: str
    section_type: str
    endpoint_path: Optional[str] = None
    similarity: float = 0.0
    relevance: float = 0.0


class Issue(BaseModel):
    severity: Severity
    title: str
    detail: str
    location: Optional[str] = None  # endpoint path or section


class CategoryScores(BaseModel):
    security: int = 0
    documentation: int = 0
    completeness: int = 0
    best_practices: int = 0


class Report(BaseModel):
    doc_id: str
    file_name: str
    overall_score: int = 0
    category_scores: CategoryScores = Field(default_factory=CategoryScores)
    issues: List[Issue] = Field(default_factory=list)
    summary: str = ""


class DeleteResponse(BaseModel):
    deleted: int
    doc_id: str
