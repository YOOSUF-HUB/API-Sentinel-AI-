"""Central configuration and shared client singletons.

Loads environment variables from backend/.env and exposes lazily-initialized
Supabase and Groq clients plus the embedding model name.
"""
from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

# Load backend/.env regardless of the current working directory.
_ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_ENV_PATH)


class Settings:
    """Strongly-typed view over the environment."""

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # all-MiniLM-L6-v2 produces 384-dim vectors; must match the SQL schema.
    EMBEDDING_DIM: int = 384

    # Retrieval defaults.
    TOP_K: int = 5
    RELEVANCE_THRESHOLD: float = 0.5

    def require(self) -> None:
        """Raise if mandatory secrets are missing (called at startup)."""
        missing = [
            name
            for name in ("GROQ_API_KEY", "SUPABASE_URL", "SUPABASE_KEY")
            if not getattr(self, name)
        ]
        if missing:
            raise RuntimeError(
                "Missing required environment variables: "
                + ", ".join(missing)
                + ". Copy backend/.env.example to backend/.env and fill them in."
            )


settings = Settings()


@lru_cache(maxsize=1)
def get_supabase():
    """Return a cached Supabase client."""
    from supabase import create_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_KEY are not configured.")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


@lru_cache(maxsize=1)
def get_groq():
    """Return a cached Groq client."""
    from groq import Groq

    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    return Groq(api_key=settings.GROQ_API_KEY)
