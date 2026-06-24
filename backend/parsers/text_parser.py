"""Parse plain-text and PDF API documentation into chunks.

Unlike the OpenAPI parser there is no formal structure to exploit, so we split
on headings / blank lines and tag sections heuristically (auth, endpoint, etc.).
The chunker downstream still enforces size limits; here we focus on producing
coherent, topically-tagged blocks.
"""
from __future__ import annotations

import io
import re
from typing import List

from models.schemas import Chunk

# Lines that look like REST endpoints, e.g. "GET /users/{id}".
_ENDPOINT_RE = re.compile(
    r"\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b\s+(/\S*)", re.IGNORECASE
)
_AUTH_HINTS = ("auth", "token", "oauth", "api key", "api-key", "bearer", "credential", "scope")


def extract_pdf_text(data: bytes) -> str:
    """Extract text from a PDF byte payload using pdfplumber."""
    import pdfplumber

    out: List[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text.strip():
                out.append(text)
    return "\n\n".join(out)


def parse(raw: str, file_name: str) -> List[Chunk]:
    """Split free-form documentation into topically tagged chunks."""
    blocks = _split_into_blocks(raw)
    chunks: List[Chunk] = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        section_type, endpoint_path = _classify(block)
        chunks.append(
            Chunk(content=block, section_type=section_type, endpoint_path=endpoint_path)
        )
    if not chunks:
        # Fall back to a single chunk so nothing silently disappears.
        chunks.append(Chunk(content=raw.strip(), section_type="text"))
    return chunks


def _split_into_blocks(raw: str) -> List[str]:
    """Split on Markdown headings first, then on blank-line paragraphs."""
    normalized = raw.replace("\r\n", "\n").replace("\r", "\n")

    # If the doc uses Markdown headings, break on them so each section starts
    # at a heading and keeps its body.
    if re.search(r"^#{1,6}\s", normalized, re.MULTILINE):
        parts = re.split(r"(?=^#{1,6}\s)", normalized, flags=re.MULTILINE)
        return [p for p in parts if p.strip()]

    # Otherwise split on blank lines (paragraphs).
    return [p for p in re.split(r"\n\s*\n", normalized) if p.strip()]


def _classify(block: str) -> tuple[str, str | None]:
    endpoint_match = _ENDPOINT_RE.search(block)
    if endpoint_match:
        method = endpoint_match.group(1).upper()
        path = endpoint_match.group(2)
        return "endpoint", f"{method} {path}"

    lowered = block.lower()
    if any(hint in lowered for hint in _AUTH_HINTS):
        return "auth", None
    return "text", None
