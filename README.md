# 🛡️ API Sentinel AI

An **agentic RAG** system that reviews API documentation like a senior technical reviewer. Upload an API specification and Sentinel ingests it into a vector store, then runs a 5-node LangGraph agent that surfaces **security, documentation, and best-practice** issues as a scored, categorized report.

- **Ingest** OpenAPI/Swagger (JSON + YAML), plain text, Markdown, and PDF.
- **Retrieve** the relevant sections with pgvector cosine search.
- **Review** with a LangGraph agent (plan → retrieve → grade → analyze → synthesize) over Groq's `openai/gpt-oss-120b`.
- **Score** deterministically into four categories with severity-tagged issues.
- **Stream** progress and the final report to the UI over NDJSON.

---

## Architecture

```text
┌──────────────┐     upload      ┌───────────────────────────── FastAPI ─────────────────────────────┐
│  Next.js UI  │ ──────────────► │  /upload   parse → chunk → embed → store (Supabase pgvector)        │
│  (frontend)  │                 │  /review   ┌── Sentinel agent (LangGraph) ──────────────┐          │
│              │ ◄─ NDJSON ────  │            │ query_planner → retriever → relevance_grader │ → Report │
│  upload page │   stream        │            │        → analyzer → synthesizer              │          │
│  review page │                 │            └──────────────────────────────────────────────┘          │
└──────────────┘                 │  /report   one-shot review    /document  delete                     │
                                 └────────────────────────────────────────────────────────────────────┘
                                        │ embeddings: sentence-transformers all-MiniLM-L6-v2 (384-dim)
                                        │ LLM: Groq openai/gpt-oss-120b
                                        ▼
                                 Supabase Postgres + pgvector (api_documents, match_api_documents RPC)
```

**The agent (5 nodes, `backend/agents/sentinel_agent.py`):**

1. **query_planner** — splits the question into focused sub-questions.
2. **retriever** — cosine-searches the document for each sub-question (top-K each).
3. **relevance_grader** — LLM-grades chunks 0–1 and drops those below the threshold.
4. **analyzer** — reasons over the kept chunks, surfacing issues and coverage gaps.
5. **synthesizer** — folds everything into a scored `Report` with a narrative summary.

Scoring is **deterministic** and rule-based (`backend/agents/tools.py`): CRITICAL issues subtract more than WARNINGs, keyword-routed into the four categories, clamped 0–100. The LLM handles planning/grading/analysis/summary; the numbers stay reproducible.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| Backend | FastAPI · Uvicorn |
| Agent | LangGraph · langchain-core |
| LLM | Groq — `openai/gpt-oss-120b` |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` (384-dim, normalized) |
| Vector store | Supabase (Postgres + `pgvector`) |
| Parsing | PyYAML · prance · openapi-spec-validator · pdfplumber |

---

## Project Structure

```text
.
├── .env.example              # Combined backend + frontend env reference
├── supabase_setup.sql        # DB schema + match_api_documents() RPC (run first)
├── backend/
│   ├── main.py               # FastAPI app: /upload, /review, /report, /document
│   ├── config.py             # Settings + cached Supabase/Groq singletons
│   ├── models/schemas.py     # Pydantic contracts (Report, Issue, ReviewMode, …)
│   ├── parsers/              # OpenAPI + text/PDF parsers → structured chunks
│   ├── rag/                  # chunker · embedder · retriever · pipeline
│   ├── agents/               # sentinel_agent (LangGraph) · tools (scoring)
│   └── samples/petstore.json # Sample spec for testing
└── frontend/
    ├── app/                  # / (upload) and /review (streaming report)
    ├── components/           # FileUpload · ChatInterface · ReportCard · SecurityBadge
    └── lib/                  # api.ts (network) · types.ts (backend mirror)
```

---

## Running Locally

### 1. Database

Run [`supabase_setup.sql`](supabase_setup.sql) in the Supabase SQL editor. It enables `pgvector`, creates the `api_documents` table (with an `ivfflat` cosine index), and defines the `match_api_documents` RPC.

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp ../.env.example .env   # then fill in the values below
uvicorn main:app --reload --port 8000
```

Backend `.env`:

| Variable | Purpose | Default |
|---|---|---|
| `GROQ_API_KEY` | Groq LLM access (**required**) | — |
| `GROQ_MODEL` | LLM model | `openai/gpt-oss-120b` |
| `SUPABASE_URL` | Supabase project URL (**required**) | — |
| `SUPABASE_KEY` | Supabase **service_role** key (**required**) | — |
| `EMBEDDING_MODEL` | sentence-transformers model | `all-MiniLM-L6-v2` |

> **Use the `service_role` (secret) key**, not a publishable/anon key — the backend writes to `api_documents` server-side and bypasses RLS. Keep it server-side only; never expose it to the frontend.

The first review downloads the `all-MiniLM-L6-v2` model (~90 MB) into a gitignored cache.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL (default http://localhost:8000)
npm install
npm run dev                         # http://localhost:3000
```

---

## API

| Method | Route | Body / Params | Returns |
|---|---|---|---|
| `POST` | `/upload` | multipart `file` | `{ doc_id, file_name, chunk_count, section_types[] }` |
| `POST` | `/review` | `{ doc_id, question, mode }` | **NDJSON stream** of progress events + final report |
| `GET` | `/report/{doc_id}` | `?mode=` | one-shot scored `Report` |
| `DELETE` | `/document/{doc_id}` | — | `{ deleted, doc_id }` |

**Review modes:** `security` · `documentation` · `production` · `data_exposure` · `custom` (free-form question).

**Streamed `/review` events** (one JSON object per line):

```jsonc
{"type": "progress", "node": "retriever", "label": "Retrieving relevant sections"}
{"type": "report",   "report": { "overall_score": 80, "category_scores": {…}, "issues": [ {"severity": "CRITICAL", "title": "…", "detail": "…", "location": "…"} ], "summary": "…" }}
{"type": "error",    "detail": "…"}
```

**Report shape:** `overall_score` (0–100), `category_scores` (`security`, `documentation`, `completeness`, `best_practices`), an array of `Issue`s (severity `CRITICAL` / `WARNING` / `PASS`), and a narrative `summary`.

---

## Quick test

```bash
# with the backend running:
DOC=$(curl -s -F "file=@backend/samples/petstore.json" http://localhost:8000/upload | python -c "import sys,json;print(json.load(sys.stdin)['doc_id'])")

curl -N -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d "{\"doc_id\":\"$DOC\",\"question\":\"Review this API for security issues.\",\"mode\":\"security\"}"
```

Or use the UI: open http://localhost:3000, drop in a spec, and click **Start review**.

---

## Design notes

- **Semantic-boundary-first chunking** — parsers emit whole units (one endpoint, one schema); the chunker only splits a unit if it overflows `MAX_CHARS` (1200), so retrieval never returns half an operation.
- **Server-side vector search** — cosine similarity runs in Postgres via `match_api_documents`; `EMBEDDING_DIM = 384` in `config.py` must match `vector(384)` in the schema.
- **Deterministic scoring, LLM reasoning** — the LLM finds and describes issues; a rule-based scorer turns them into reproducible numbers.
- **Graceful degradation** — anything that fails OpenAPI validation falls back to text parsing; text parsing falls back to a single chunk so content never silently disappears.
- **Typed contracts end to end** — Pydantic models on the backend, mirrored by `frontend/lib/types.ts`.
