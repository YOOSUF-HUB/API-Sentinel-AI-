"""Sentence-transformers embedding wrapper (all-MiniLM-L6-v2, 384-dim)."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from config import settings


@lru_cache(maxsize=1)
def _model():
    """Load the embedding model once and cache it.

    Imported lazily so that importing this module (e.g. for type hints) does not
    pull in torch until an embedding is actually requested.
    """
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a batch of strings into 384-dim vectors (plain Python lists)."""
    if not texts:
        return []
    vectors = _model().encode(
        texts,
        normalize_embeddings=True,  # unit vectors -> cosine == dot product
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return [v.tolist() for v in vectors]


def embed_text(text: str) -> List[float]:
    """Embed a single string."""
    return embed_texts([text])[0]
