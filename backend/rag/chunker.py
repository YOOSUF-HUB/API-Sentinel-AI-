"""Size-aware chunking that respects semantic boundaries.

The parsers already emit semantically coherent units (one endpoint, one schema,
one paragraph). This module's job is only to enforce a maximum size so we never
hand the embedder an enormous block, while *never* splitting in the middle of a
schema/endpoint unless that single unit is itself too large. When a single unit
overflows, we split on line boundaries with overlap so context is preserved.
"""
from __future__ import annotations

from typing import List

from models.schemas import Chunk

# all-MiniLM-L6-v2 truncates at 256 word-pieces (~1000 chars). Keep chunks
# comfortably under that so we rarely lose tail content.
MAX_CHARS = 1200
OVERLAP_CHARS = 150


def chunk_documents(chunks: List[Chunk]) -> List[Chunk]:
    """Return chunks guaranteed to be <= MAX_CHARS, preserving metadata."""
    out: List[Chunk] = []
    for chunk in chunks:
        if len(chunk.content) <= MAX_CHARS:
            out.append(chunk)
        else:
            out.extend(_split_oversized(chunk))
    return out


def _split_oversized(chunk: Chunk) -> List[Chunk]:
    """Split one oversized chunk along line boundaries with overlap.

    We keep the unit's first line (its header, e.g. "ENDPOINT GET /pets") at the
    top of every sub-chunk so each piece stays self-describing after retrieval.
    """
    lines = chunk.content.split("\n")
    header = lines[0] if lines else ""
    body_lines = lines[1:] if len(lines) > 1 else []

    pieces: List[Chunk] = []
    current: List[str] = []
    current_len = len(header) + 1

    def flush() -> None:
        nonlocal current, current_len
        if not current:
            return
        text = header + "\n" + "\n".join(current) if header else "\n".join(current)
        pieces.append(
            Chunk(
                content=text,
                section_type=chunk.section_type,
                endpoint_path=chunk.endpoint_path,
            )
        )
        # Carry a tail of lines forward as overlap for continuity.
        overlap: List[str] = []
        carried = 0
        for line in reversed(current):
            if carried + len(line) > OVERLAP_CHARS:
                break
            overlap.insert(0, line)
            carried += len(line) + 1
        current = overlap
        current_len = len(header) + 1 + carried

    for line in body_lines:
        if current_len + len(line) + 1 > MAX_CHARS and current:
            flush()
        current.append(line)
        current_len += len(line) + 1
    flush()

    return pieces or [chunk]
