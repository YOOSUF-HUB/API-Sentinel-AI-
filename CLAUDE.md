# API Sentinel AI

A RAG-powered API documentation reviewer. It ingests API specifications (OpenAPI/Swagger, plain text, or PDF), embeds them into a vector store, and is designed to run AI agent reviews over them that surface security, documentation, and best-practice issues as a scored report.

> **Status note:** The ingestion + retrieval pipeline is implemented and working. The agent/review layer and the HTTP API surface are scaffolded but not yet built (see [Current State](#current-state)). Anything described as "planned" below is implied by the data models and dependencies but has no code yet.

## Tech Stack

### Backend (`backend/`)
- **Python** 3.13 (per the local `.venv`)
- **FastAPI** 0.115.6 + **Uvicorn** 0.34.0 (`uvicorn[standard]`) — web framework (no app entry point wired up yet)
- **Pydantic** 2.10.4 — data models / schemas
- **python-multipart** 0.0.20 — file upload handling
- **python-dotenv** 1.0.1 — env loading
- **Groq** 0.13.1 — LLM client; default model `llama-3.3-70b-versatile`
- **Supabase** 2.11.0 — Postgres + `pgvector` store and RPC
- **sentence-transformers** 3.3.1 — embeddings via `all-MiniLM-L6-v2` (384-dim)
- **LangGraph** 0.2.60 + **langchain-core** 0.3.28 — agent orchestration (planned; not yet used)
- **PyYAML** 6.0.2, **prance** 23.6.21.0, **openapi-spec-validator** 0.7.1 — OpenAPI/Swagger parsing
- **pdfplumber** 0.11.5 — PDF text extraction
- **httpx** 0.27.2

### Frontend (`frontend/`)
- **Next.js** — inferred from `NEXT_PUBLIC_API_URL` and the `app/`, `components/`, `lib/` directory layout. **No `package.json` exists yet** — the directories are empty scaffolding.

### Data store
- **Supabase** (Postgres) with the **`pgvector`** extension. Schema and the cosine-similarity RPC live in [supabase_setup.sql](supabase_setup.sql).

## Project Structure

```
.
├── .env.example              # Combined backend + frontend env reference
├── supabase_setup.sql        # DB schema + match_api_documents() RPC (run before backend)
├── backend/
│   ├── .env.example          # Backend-specific env vars
│   ├── requirements.txt      # Python dependencies
│   ├── config.py             # Settings + cached Supabase/Groq client singletons
│   ├── models/
│   │   └── schemas.py        # Pydantic models (Chunk, Report, Issue, ReviewRequest, ...)
│   ├── parsers/
│   │   ├── openapi_parser.py # OpenAPI/Swagger (JSON+YAML) -> structured chunks
│   │   └── text_parser.py    # Plain-text + PDF -> heuristically tagged chunks
│   ├── rag/
│   │   ├── chunker.py        # Size-aware chunking (MAX_CHARS=1200, OVERLAP=150)
│   │   ├── embedder.py       # sentence-transformers wrapper (384-dim, normalized)
│   │   ├── retriever.py      # pgvector cosine retrieval via match_api_documents RPC
│   │   └── pipeline.py       # Ingestion orchestration + document deletion
│   ├── agents/               # EMPTY — intended for LangGraph review agents
│   └── samples/
│       └── petstore.json     # Sample OpenAPI spec for testing
└── frontend/
    ├── app/                  # EMPTY (Next.js app router scaffolding)
    ├── components/           # EMPTY
    └── lib/                  # EMPTY
```

## How It Works (Ingestion → Retrieval Pipeline)

1. **Parse** ([pipeline.py](backend/rag/pipeline.py) `parse_file`): picks a parser by extension/content. `.pdf` → pdfplumber text extraction; `.json/.yaml/.yml` or content that "looks like OpenAPI" → `openapi_parser`; everything else → `text_parser`. Invalid specs gracefully fall back to plain-text parsing.
2. **Chunk** ([chunker.py](backend/rag/chunker.py)): parsers emit semantically coherent units (one endpoint, one schema, one paragraph); the chunker only splits units that exceed `MAX_CHARS` (1200), splitting on line boundaries with 150-char overlap and repeating the unit header on each sub-chunk.
3. **Embed** ([embedder.py](backend/rag/embedder.py)): `all-MiniLM-L6-v2`, normalized to unit vectors so cosine == dot product. Model is lazily loaded and `lru_cache`d.
4. **Store** ([pipeline.py](backend/rag/pipeline.py) `ingest`): one `doc_id` (uuid) per upload; rows inserted into the `api_documents` table in batches of 100.
5. **Retrieve** ([retriever.py](backend/rag/retriever.py)): embeds the query and calls the `match_api_documents` Supabase RPC for top-K (default 5) cosine-nearest chunks, optionally scoped to a single `doc_id`.

## Running Locally

> No process manager, Makefile, or `main.py` exists yet. The commands below are the conventional way to run the stack given the current dependencies; the FastAPI app and frontend `package.json` still need to be created.

### 1. Database setup
Run [supabase_setup.sql](supabase_setup.sql) in the Supabase SQL editor. It enables `pgvector`, creates the `api_documents` table (with an `ivfflat` cosine index), and defines the `match_api_documents` RPC.

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY
# Once a FastAPI app entry point exists, e.g.:
# uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
cp ../.env.example .env.local   # set NEXT_PUBLIC_API_URL (default http://localhost:8000)
# Once package.json exists:
# npm install && npm run dev
```

### Environment variables
| Variable | Where | Purpose | Default |
|---|---|---|---|
| `GROQ_API_KEY` | backend `.env` | Groq LLM access (required) | — |
| `GROQ_MODEL` | backend `.env` | LLM model | `llama-3.3-70b-versatile` |
| `SUPABASE_URL` | backend `.env` | Supabase project URL (required) | — |
| `SUPABASE_KEY` | backend `.env` | Supabase API key (required) | — |
| `EMBEDDING_MODEL` | backend `.env` | sentence-transformers model | `all-MiniLM-L6-v2` |
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | Backend base URL | `http://localhost:8000` |

`config.py` loads `backend/.env` regardless of CWD and exposes `settings.require()` to fail fast on missing secrets at startup.

## Architecture Decisions & Patterns

- **Layered, framework-thin design.** Parsing → chunking → embedding → storage are independent modules under `backend/rag/` and `backend/parsers/`; `pipeline.py` orchestrates them so the (future) FastAPI routes stay thin.
- **Semantic-boundary-first chunking.** Parsers produce whole units (a full endpoint operation, a full schema). The chunker never splits mid-unit unless a single unit overflows `MAX_CHARS`, so retrieval never returns "half an operation."
- **Lazy, cached singletons.** Supabase/Groq clients (`config.py`) and the embedding model (`embedder.py`) use `functools.lru_cache`. Heavy imports (`torch`/sentence-transformers, supabase, groq) are imported inside functions so importing a module for type hints doesn't pull in the world.
- **Server-side vector search.** Cosine similarity runs in Postgres via the `match_api_documents` SQL function rather than in Python; `EMBEDDING_DIM = 384` in `config.py` must stay in sync with `vector(384)` in the SQL schema.
- **Graceful degradation in parsing.** OpenAPI detection is heuristic; anything that fails OpenAPI validation falls back to text parsing, and text parsing falls back to a single chunk so content never silently disappears. Byte decoding tries `utf-8`, `utf-8-sig`, then `latin-1`.
- **Typed contracts everywhere.** All cross-layer data is Pydantic models in [schemas.py](backend/models/schemas.py), including the planned agent output (`Report`, `Issue`, `CategoryScores`) and enums (`Severity`, `ReviewMode`).

## External Services & Integrations

- **Groq** — LLM inference (default `llama-3.3-70b-versatile`). Client wired in `config.py`; not yet invoked anywhere.
- **Supabase** — Postgres + `pgvector` for chunk storage and similarity search; actively used by the pipeline and retriever.
- **Hugging Face / sentence-transformers** — downloads `all-MiniLM-L6-v2` on first embed (cached under `.cache/`, which is gitignored).

## Project Phase

**Early-to-mid development — building bottom-up, the foundational data layer is done.**

The entire git history is from a single day (2026-06-24), 8 commits, each adding one clean layer from the bottom up:

1. Initial backend structure + DB setup
2. `api_documents` table refactor (introduced `doc_id` grouping)
3. Config + Pydantic models
4. OpenAPI parser
5. Text/PDF parser
6. Chunker
7. Embedder
8. Ingestion + retrieval pipeline ← most recent

The code is polished and consistent (full docstrings, type hints, deliberate design notes) rather than rough/exploratory — but only the *data ingestion + retrieval half* of the product exists. The "AI reviewer" half (agents, LLM calls) and the entire API/UI surface have not been started. So: past scaffolding, foundation complete, **not yet a runnable end-to-end app.**

## Current State

**Implemented & working (the RAG ingestion/retrieval core):**
- Config and client singletons ([config.py](backend/config.py))
- Full Pydantic schema set ([schemas.py](backend/models/schemas.py)) — including models for features not yet built
- OpenAPI/Swagger parser, text/PDF parser
- Chunker, embedder, retriever
- Ingestion + delete pipeline ([pipeline.py](backend/rag/pipeline.py))
- Supabase schema and RPC ([supabase_setup.sql](supabase_setup.sql))
- Sample spec for testing ([petstore.json](backend/samples/petstore.json))

**In progress / partially present:**
- The Groq client is wired up in `config.py` (with a default model) and the `Report`/`Issue`/`CategoryScores`/`ReviewMode`/`Severity` models are fully defined — but nothing consumes them yet. This is the "next layer" half-prepared.

**Untouched / stubbed:**
- **`backend/agents/`** — only an empty `__init__.py`. LangGraph + langchain-core are installed and the report models exist, but there is zero agent code. This is the clear next build target.
- **FastAPI app** — no `main.py`/`app.py` entry point and no routes exist, despite `python-multipart` (uploads), `fastapi`, `uvicorn`, and the request/response models (`UploadResponse`, `ReviewRequest`, `Report`, `DeleteResponse`) all being ready. The pipeline functions are written to be called by routes that don't exist yet.
- **Frontend** — `app/`, `components/`, `lib/` are completely empty; no `package.json`. Next.js is only inferred from `NEXT_PUBLIC_API_URL` and the directory layout.
- **Tests** — none present (no test dir, no pytest/testing dependency).

## Where We Likely Left Off

**Most recent active area: the RAG retrieval layer was just completed; the natural next step is the agent + API layer.**

Evidence:
- The newest non-doc file is [pipeline.py](backend/rag/pipeline.py) (the last commit, "Add ingestion and retrieval functionality"), alongside [retriever.py](backend/rag/retriever.py). These tie the parse→chunk→embed→store→retrieve flow together end to end.
- [pipeline.py](backend/rag/pipeline.py) exposes `ingest()` and `delete_document()` returning exactly the shapes the (unwritten) FastAPI routes need — and `UploadResponse`/`DeleteResponse` already exist in `schemas.py`. The data layer is finished and "waiting" for an HTTP layer.
- The `Report`/`Issue`/`ReviewMode` models and the wired-but-unused Groq client signal the *intended* next feature: a LangGraph agent in `backend/agents/` that takes a `ReviewRequest`, calls `retriever.retrieve()`, runs the Groq LLM over the chunks, and emits a `Report`.

**The two most plausible immediate next tasks:**
1. Build the FastAPI app (`backend/main.py`) exposing upload / review / delete routes over the existing pipeline + retriever.
2. Build the review agent under `backend/agents/` (LangGraph + Groq) that turns retrieved chunks into a `Report`.

No half-finished functions, dangling TODOs, or commented-out code were found — the work was left at a clean layer boundary, not mid-function. The only `# pragma: no cover` (in [openapi_parser.py:51](backend/parsers/openapi_parser.py#L51)) is an intentional coverage exclusion, not unfinished work.

## Conventions

- **Module docstrings** open every Python file with a concise description of its responsibility; non-obvious decisions get inline comments (e.g. the 384-dim ↔ schema coupling, the 256-word-piece truncation behind `MAX_CHARS`).
- **`from __future__ import annotations`** at the top of every backend module.
- **Type hints** on all public functions; `List`/`Optional`/`Tuple` from `typing`.
- **Private helpers** prefixed with `_` (e.g. `_split_oversized`, `_one_operation`, `_decode`).
- **Naming:** `snake_case` functions/modules, `PascalCase` Pydantic models, `UPPER_CASE` module constants and settings fields.
- **Chunk section types** are short lowercase strings: `info`, `auth`, `endpoint`, `schema`, `text`, `general`.
- **Imports are backend-root-relative** (`from config import ...`, `from rag.chunker import ...`), implying the backend is run with `backend/` on the path / as the working directory.
- **Section banners** (`# ---- ... ----`) separate logical groups within larger modules.
