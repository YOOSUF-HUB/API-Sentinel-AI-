"""Ingestion orchestration: raw bytes -> parsed -> chunked -> embedded -> stored.

Keeps the FastAPI route thin. Also handles document deletion.
"""
from __future__ import annotations

import uuid
from typing import List, Tuple

from config import get_supabase
from models.schemas import Chunk
from parsers import openapi_parser, text_parser
from rag.chunker import chunk_documents
from rag.embedder import embed_texts

# Batch size for inserts into Supabase.
_INSERT_BATCH = 100


def parse_file(file_name: str, data: bytes) -> List[Chunk]:
    """Pick a parser based on extension / content and return raw chunks."""
    lower = file_name.lower()

    if lower.endswith(".pdf"):
        raw = text_parser.extract_pdf_text(data)
        return text_parser.parse(raw, file_name)

    raw = _decode(data)

    if lower.endswith((".json", ".yaml", ".yml")) or openapi_parser.looks_like_openapi(raw):
        try:
            return openapi_parser.parse(raw, file_name)
        except ValueError:
            # Not actually a valid spec — treat as plain text.
            return text_parser.parse(raw, file_name)

    return text_parser.parse(raw, file_name)


def ingest(file_name: str, data: bytes) -> Tuple[str, List[Chunk]]:
    """Full ingestion. Returns (doc_id, stored_chunks)."""
    raw_chunks = parse_file(file_name, data)
    chunks = chunk_documents(raw_chunks)
    if not chunks:
        raise ValueError("No content could be extracted from the document.")

    embeddings = embed_texts([c.content for c in chunks])
    doc_id = str(uuid.uuid4())

    rows = [
        {
            "doc_id": doc_id,
            "file_name": file_name,
            "section_type": chunk.section_type,
            "endpoint_path": chunk.endpoint_path,
            "content": chunk.content,
            "embedding": embedding,
        }
        for chunk, embedding in zip(chunks, embeddings)
    ]

    supabase = get_supabase()
    for start in range(0, len(rows), _INSERT_BATCH):
        supabase.table("api_documents").insert(rows[start : start + _INSERT_BATCH]).execute()

    return doc_id, chunks


def delete_document(doc_id: str) -> int:
    """Delete all chunks for a document. Returns the number of rows removed."""
    supabase = get_supabase()
    response = (
        supabase.table("api_documents").delete().eq("doc_id", doc_id).execute()
    )
    return len(response.data or [])


def get_file_name(doc_id: str) -> str:
    """Look up the stored file name for a document, or "" if unknown.

    The review endpoints only receive a ``doc_id``; the file name is recovered
    here so the emitted Report is self-contained.
    """
    supabase = get_supabase()
    response = (
        supabase.table("api_documents")
        .select("file_name")
        .eq("doc_id", doc_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0].get("file_name", "") if rows else ""


def _decode(data: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")
