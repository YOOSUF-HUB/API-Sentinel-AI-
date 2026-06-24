"""Cosine-similarity retrieval over Supabase pgvector.

Uses the `match_api_documents` SQL function (see supabase_setup.sql) which does
the nearest-neighbour search server-side and returns a similarity score in
[0, 1] (1 - cosine distance).
"""
from __future__ import annotations

from typing import List, Optional

from config import get_supabase, settings
from models.schemas import RetrievedChunk
from rag.embedder import embed_text


def retrieve(
    query: str,
    doc_id: Optional[str] = None,
    top_k: int = settings.TOP_K,
) -> List[RetrievedChunk]:
    """Return the top_k most similar chunks for a query, optionally scoped to a
    single document via doc_id."""
    query_embedding = embed_text(query)
    supabase = get_supabase()

    params = {
        "query_embedding": query_embedding,
        "match_count": top_k,
        "filter_doc_id": doc_id,
    }
    response = supabase.rpc("match_api_documents", params).execute()
    rows = response.data or []

    return [
        RetrievedChunk(
            content=row.get("content", ""),
            section_type=row.get("section_type", "general"),
            endpoint_path=row.get("endpoint_path"),
            similarity=float(row.get("similarity", 0.0)),
        )
        for row in rows
    ]
