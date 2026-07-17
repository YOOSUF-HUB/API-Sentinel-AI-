# 🛡️ API Sentinel AI

> **🚀 Live deployment:** [api-sentinel-ai.vercel.app](https://api-sentinel-ai.vercel.app/)

An **agentic RAG** system that reviews API documentation like a senior technical reviewer. Upload an API specification and Sentinel ingests it into a vector store, then runs a 5-node LangGraph agent that surfaces **security, documentation, and best-practice** issues as a scored, categorized report — and streams every step of its reasoning to the UI so you can watch it plan, retrieve, grade, analyze, and synthesize in real time.

- **Ingest** OpenAPI/Swagger (JSON + YAML), plain text, Markdown, and PDF.
- **Retrieve** the relevant sections with pgvector cosine search, scoped to one document.
- **Review** with a LangGraph agent (plan → retrieve → grade → analyze → synthesize) over Groq's `openai/gpt-oss-120b`.
- **Score** deterministically into four categories with severity-tagged issues.
- **Stream** progress and the final report to the UI over NDJSON.

This README is the **complete technical blueprint** of the project: architecture, every module, the data model, the streaming protocol, the design system, configuration, and how to run, deploy, and extend it.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [End-to-end data flow](#end-to-end-data-flow)
  - [1. Ingestion pipeline](#1-ingestion-pipeline)
  - [2. Retrieval](#2-retrieval)
  - [3. The review agent (5 nodes)](#3-the-review-agent-5-nodes)
  - [4. Deterministic scoring](#4-deterministic-scoring)
- [Backend reference](#backend-reference)
- [Data model](#data-model)
- [HTTP API](#http-api)
- [Streaming protocol (NDJSON)](#streaming-protocol-ndjson)
- [Frontend reference](#frontend-reference)
- [Design system](#design-system)
- [Configuration reference](#configuration-reference)
- [Database schema](#database-schema)
- [Running locally](#running-locally)
- [Deployment](#deployment)
- [Quick test](#quick-test)
- [Design principles](#design-principles)
- [Extending the system](#extending-the-system)

---

## What it does

A user uploads an OpenAPI spec, text, Markdown, or PDF. The backend parses it into semantically coherent chunks, embeds them locally, and stores them in Postgres/pgvector. The user then picks a **review focus** (or asks a free-form question), and a five-node LangGraph agent runs a retrieval-augmented review:

1. It **plans** the search — breaking the request into focused sub-questions.
2. It **retrieves** the most relevant sections of *their* document.
3. It **grades** each retrieved chunk and discards the irrelevant ones.
4. It **analyzes** what remains, surfacing concrete issues and coverage gaps.
5. It **synthesizes** a scored report with a narrative summary.

The distinguishing idea: **the trace is the product.** Every node streams its intermediate work (the planner's sub-questions, the grader's kept/dropped split, the analyzer's reasoning) to the UI, so the review is inspectable rather than a black box behind a spinner.

**Scoring is deterministic.** The LLM finds and describes issues; a rule-based scorer turns them into reproducible 0–100 numbers, so the same issues always produce the same score.

---

## Architecture

```text
┌──────────────┐     upload      ┌───────────────────────────── FastAPI ─────────────────────────────┐
│  Next.js UI  │ ──────────────► │  /upload   parse → chunk → embed → store (Supabase pgvector)        │
│  (frontend)  │                 │  /review   ┌── Sentinel agent (LangGraph) ──────────────┐          │
│              │ ◄─ NDJSON ────  │            │ query_planner → retriever → relevance_grader │ → Report │
│  upload page │   stream        │            │        → analyzer → synthesizer              │          │
│  review page │                 │            └──────────────────────────────────────────────┘          │
└──────────────┘                 │  /report   one-shot review    /document  delete    /health           │
                                 └────────────────────────────────────────────────────────────────────┘
                                        │ embeddings: sentence-transformers all-MiniLM-L6-v2 (384-dim)
                                        │ LLM: Groq openai/gpt-oss-120b (JSON + text completions)
                                        ▼
                                 Supabase Postgres + pgvector (api_documents, match_api_documents RPC)
```

**Three tiers, cleanly separated:**

| Tier | Responsibility | Key modules |
| --- | --- | --- |
| **Frontend** (Next.js) | Upload, drive the review, render the live trace + report | `app/`, `components/`, `lib/` |
| **Backend** (FastAPI) | Thin HTTP surface over ingestion + the agent | `main.py` |
| **Ingestion** (RAG) | Parse → chunk → embed → store; retrieve | `parsers/`, `rag/` |
| **Agent** (LangGraph) | 5-node review pipeline + deterministic scoring | `agents/` |
| **Storage** (Supabase) | Vector store with server-side cosine search | `supabase_setup.sql` |

The FastAPI routes do no heavy lifting — they validate input, call `rag/pipeline.py` or `agents/sentinel_agent.py`, and shape responses.

---

## Tech stack

| Layer | Choice | Version |
| --- | --- | --- |
| Frontend framework | Next.js (App Router) | 14.2.35 |
| UI runtime | React / React DOM | 18.3.1 |
| Language (frontend) | TypeScript | 5.5.3 |
| Styling | Tailwind CSS | 3.4.6 |
| Backend framework | FastAPI | 0.115.6 |
| ASGI server | Uvicorn (`[standard]`) | 0.34.0 |
| Validation | Pydantic | 2.10.4 |
| Agent orchestration | LangGraph · langchain-core | 0.2.60 · 0.3.28 |
| LLM | Groq — `openai/gpt-oss-120b` | groq SDK 0.13.1 |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` (384-dim, normalized) | 3.3.1 |
| Vector store | Supabase (Postgres + `pgvector`) | supabase-py 2.11.0 |
| OpenAPI parsing | PyYAML · prance · openapi-spec-validator | 6.0.2 · 23.6.21.0 · 0.7.1 |
| PDF parsing | pdfplumber | 0.11.5 |
| Runtime (backend) | Python | 3.12.8 (pinned in `.python-version`) |

---

## Repository layout

```text
.
├── CLAUDE.md                     # Design-context pointer for AI-assisted work
├── PRODUCT.md                    # Product strategy: register, users, positioning, principles
├── DESIGN.md                     # Visual system: tokens, color roles, typography, components
├── .env.example                  # Combined backend + frontend env reference
├── .python-version               # 3.12.8 — pins the backend runtime (Render reads this)
├── supabase_setup.sql            # DB schema + match_api_documents() RPC (run first)
│
├── backend/
│   ├── main.py                   # FastAPI app: /health /upload /review /report /document
│   ├── config.py                 # Settings + cached Supabase/Groq singletons + tunables
│   ├── requirements.txt          # Pinned Python dependencies
│   ├── .python-version           # 3.12
│   ├── models/
│   │   └── schemas.py            # Pydantic contracts (Report, Issue, Chunk, ReviewMode, …)
│   ├── parsers/
│   │   ├── openapi_parser.py     # OpenAPI/Swagger (JSON+YAML) → info/auth/endpoint/schema chunks
│   │   └── text_parser.py        # Plain text / Markdown / PDF → heuristically-tagged chunks
│   ├── rag/
│   │   ├── pipeline.py           # Orchestrates parse → chunk → embed → store; delete; lookups
│   │   ├── chunker.py            # Size-aware, semantic-boundary-preserving splitting
│   │   ├── embedder.py           # sentence-transformers wrapper (lazy, cached)
│   │   └── retriever.py          # Cosine search via the match_api_documents RPC
│   ├── agents/
│   │   ├── sentinel_agent.py     # 5-node LangGraph: run() + stream(); progress-detail builders
│   │   └── tools.py              # LLM building blocks (plan/grade/analyze/synthesize) + scoring
│   └── samples/
│       ├── petstore.json         # Swagger 2.0 sample spec
│       └── taskflow.json         # OpenAPI 3.0.3 sample spec (intentionally imperfect)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx            # Root shell: header, main, footer, metadata
    │   ├── page.tsx              # "/"  — upload page (upload → ingest → route to review)
    │   ├── review/page.tsx       # "/review" — reads doc_id/file_name, mounts ChatInterface
    │   ├── globals.css           # Tailwind layers, reduced-motion floor, scrollbars
    │   └── icon.svg              # App icon
    ├── components/
    │   ├── FileUpload.tsx        # Drag-and-drop picker with extension validation
    │   ├── ChatInterface.tsx     # Drives a streaming review: presets/custom, phases, cold-start
    │   ├── AgentTrace.tsx        # The live reasoning trace (per-node payloads, progress rail)
    │   ├── ReportCard.tsx        # Final report: score, category bars, summary, ranked issues
    │   ├── SecurityBadge.tsx     # Severity pill (CRITICAL / WARNING / PASS)
    │   └── ColdStartNotice.tsx   # Two-stage explainer for free-tier backend cold starts
    ├── lib/
    │   ├── api.ts                # Thin fetch client; NDJSON stream parser; ApiError
    │   └── types.ts              # TypeScript mirror of the backend Pydantic contract
    ├── tailwind.config.ts        # Design tokens: ink ramp, text roles, severity, motion
    ├── next.config.mjs           # reactStrictMode
    ├── tsconfig.json             # strict; @/* path alias
    └── postcss.config.mjs        # Tailwind + autoprefixer
```

---

## End-to-end data flow

### 1. Ingestion pipeline

`POST /upload` → `rag/pipeline.py::ingest()`. Raw bytes become stored, embedded chunks:

```text
bytes ──► parse_file() ──► chunk_documents() ──► embed_texts() ──► insert into api_documents
          (parser select)   (size enforcement)    (384-dim vecs)    (batched, 100/insert)
```

**a. Parser selection** (`parse_file`): by extension and content sniffing, with graceful fallback.

- `.pdf` → `text_parser.extract_pdf_text()` (pdfplumber, page by page) → `text_parser.parse()`.
- `.json` / `.yaml` / `.yml`, **or** any content that `openapi_parser.looks_like_openapi()` recognizes → `openapi_parser.parse()`. If that raises `ValueError` (not actually a valid spec), it **falls back** to `text_parser.parse()`.
- Everything else → `text_parser.parse()`.
- Bytes are decoded trying `utf-8` → `utf-8-sig` → `latin-1`, then `utf-8` with `errors="replace"` as a last resort, so a decoding hiccup never loses content.

**b. OpenAPI parsing** (`openapi_parser.py`) emits one semantically whole chunk per unit, tagged with a `section_type`:

| `section_type` | One chunk per… | Contents |
| --- | --- | --- |
| `info` | the spec | Title, API version, spec format, description, servers/host/basePath, transport schemes (flags when HTTPS is absent) |
| `auth` | security definitions + global requirement | `securitySchemes` (OpenAPI 3) / `securityDefinitions` (Swagger 2); the global `security` requirement, or an explicit note when none exists |
| `endpoint` | each operation | `METHOD /path`, operationId, summary/description, tags, deprecation, merged path- + operation-level parameters (name/in/type/required/description), request body content types, per-operation security overrides, responses with schema presence |
| `schema` | each named model | Properties with type/format/required flag and descriptions; `$ref`s resolved to their target name (e.g. `array<Pet>`) |

Handles both **OpenAPI 3** (`components.*`, `requestBody`) and **Swagger 2** (`definitions`, `securityDefinitions`, `host`/`basePath`/`schemes`). Undocumented fields are called out explicitly (e.g. `Description: (none provided)`, `no response schema`) so the reviewer can *see* the gap rather than infer it.

**c. Text/PDF parsing** (`text_parser.py`) has no formal structure to exploit, so it:

- Splits on Markdown headings (`^#{1,6}\s`) if present; otherwise on blank-line paragraphs.
- Classifies each block heuristically: a REST-endpoint regex (`GET /users/{id}`) → `endpoint` (with an `endpoint_path`); auth keyword hints (`auth`, `token`, `oauth`, `bearer`, `api key`, `scope`, …) → `auth`; otherwise `text`.
- Falls back to a **single chunk** if nothing splits, so content never silently disappears.

**d. Chunking** (`chunker.py`) enforces a size ceiling *without* breaking semantic units:

- Chunks `≤ MAX_CHARS` (1200) pass through untouched.
- An oversized unit is split along **line boundaries** with `OVERLAP_CHARS` (150) of trailing overlap carried forward for continuity, and the unit's **first line (its header, e.g. `ENDPOINT GET /pets`) is repeated at the top of every sub-chunk** so each piece stays self-describing after retrieval.
- 1200 chars sits comfortably under `all-MiniLM-L6-v2`'s ~256 word-piece (~1000 char) truncation limit.

**e. Embedding** (`embedder.py`): the model is imported lazily and cached (`lru_cache`) so importing the module doesn't pull in PyTorch. Texts are encoded with `normalize_embeddings=True` — unit vectors mean **cosine similarity equals a dot product**, which is what the pgvector index computes.

**f. Storage**: each upload gets a fresh `doc_id` (UUID v4). Rows (`doc_id`, `file_name`, `section_type`, `endpoint_path`, `content`, `embedding`) are inserted into `api_documents` in batches of 100. The response reports the `doc_id`, `chunk_count`, and the sorted set of `section_types` produced.

### 2. Retrieval

`rag/retriever.py::retrieve()` embeds the query, then calls the `match_api_documents` Postgres RPC, which does nearest-neighbour search **server-side** and returns `similarity = 1 - cosine_distance ∈ [0, 1]`. Retrieval is always scoped to a single document via `filter_doc_id`, and returns the top `TOP_K` (5) chunks per query.

### 3. The review agent (5 nodes)

`agents/sentinel_agent.py` compiles a linear `StateGraph` once at import. A `TypedDict` `AgentState` is threaded through five nodes:

```text
query_planner ─► retriever ─► relevance_grader ─► analyzer ─► synthesizer ─► END
```

| # | Node | Backing tool | What it does |
| --- | --- | --- | --- |
| 1 | **query_planner** | `tools.plan_queries` | Groq (JSON mode) breaks the request into **2–4** focused, self-contained sub-questions, steered by the review mode. Falls back to the original question if the model returns nothing usable; capped at 4. |
| 2 | **retriever** | `rag.retriever.retrieve` | Runs top-K cosine search for **each** sub-question and merges results, **de-duplicating by chunk content** so overlapping sub-questions don't double-count a section. |
| 3 | **relevance_grader** | `tools.grade_relevance` | Groq scores each chunk 0.0–1.0 for relevance; chunks `< RELEVANCE_THRESHOLD` (0.5) are dropped, the rest sorted by relevance desc. If the grader skips a chunk, it defaults to that chunk's cosine similarity. |
| 4 | **analyzer** | `tools.analyze` | Groq reasons over the kept chunks and returns `{reasoning, issues[], missing[]}`. Each issue carries a **severity** (`CRITICAL` / `WARNING` / `PASS`), title, detail, and optional location. Distinguishes problems *present* from things *missing* (undocumented). |
| 5 | **synthesizer** | `tools.synthesize` | Writes a Markdown narrative summary (Groq, text mode) and computes the deterministic score, folding everything into a `Report`. |

**Two entry points:**

- `run(...)` invokes the whole graph and returns the final `Report` (used by `GET /report`).
- `stream(...)` yields events as the graph executes with `stream_mode="updates"` (used by `POST /review`). Because an update fires *after* a node completes, the pipeline shape is streamed **up front** as a `pipeline` event so the client can render every step as pending and correctly identify which node is *currently running* (the next one it hasn't heard from).

**Progress detail is free.** Each node already computes far more than "done" — the planner's sub-questions, the grader's kept/dropped split, the analyzer's reasoning. `stream()` lifts that out of the state delta onto each `progress` event's `detail`, so the UI shows the agent's actual work with **no extra LLM calls**. Detail builders are wrapped so a malformed detail can never take the review down — the trace is decoration over the real work.

**Groq usage** (all in `tools.py`): calls funnel through `_complete_json` (JSON mode, `temperature=0.1`, falls back to `{}` on unparseable output) and `_complete_text` (`temperature=0.2`). The analyzer overrides to `temperature=0.2`. Model is `settings.GROQ_MODEL`.

### 4. Deterministic scoring

`tools.py::_score()` — rule-based, **no LLM**, so the same issues always yield the same numbers. Four categories each start at **100**:

- **CRITICAL** issue → −25; **WARNING** → −8; **PASS** → 0.
- Each penalty is routed to one category by keyword-matching the issue's title+detail:
  - `auth`, `secur`, `https`, `token`, `secret`, `inject`, `expos`, `pii` → **security**
  - `describ`, `document`, `example`, `unclear`, `naming` → **documentation**
  - `missing`, `response`, `schema`, `status code`, `pagination` → **completeness**
  - otherwise → **best_practices**
- Each undocumented gap in `missing[]` costs **−5** from completeness, capped at **−40** total.
- All categories are clamped to `[0, 100]`.
- `overall_score = round(mean(security, documentation, completeness, best_practices))`.

---

## Backend reference

Module-by-module, so you can find any behaviour fast.

| Module | Responsibility |
| --- | --- |
| `config.py` | Loads `backend/.env` regardless of CWD; exposes the `Settings` object and two `lru_cache`d client factories, `get_supabase()` / `get_groq()` (SDKs imported lazily). `settings.require()` (called at startup via the lifespan handler) fails fast if `GROQ_API_KEY` / `SUPABASE_URL` / `SUPABASE_KEY` are missing. Home of the tunables: `EMBEDDING_DIM=384`, `TOP_K=5`, `RELEVANCE_THRESHOLD=0.5`. |
| `models/schemas.py` | All Pydantic contracts, shared across the API and agent layers. See [Data model](#data-model). |
| `parsers/openapi_parser.py` | `looks_like_openapi(raw)` — cheap heuristic (`"openapi"`/`"swagger"` **and** `"paths"` in the head) for parser selection. `parse(raw, file_name)` loads JSON (fast path) or YAML and builds info/security/endpoint/schema chunks, dropping any that are blank. |
| `parsers/text_parser.py` | `extract_pdf_text(data)` (pdfplumber, page-wise) and `parse(raw, file_name)` (heading/paragraph split + heuristic classification). Regex endpoint detection and auth-keyword tagging; single-chunk fallback. |
| `rag/pipeline.py` | `ingest(file_name, data) -> (doc_id, chunks)` orchestrates the full pipeline and raises `ValueError` if nothing could be extracted. `delete_document(doc_id) -> int` removes all chunks and returns the count. `get_file_name(doc_id) -> str` recovers the stored file name so a `Report` is self-contained (the review endpoints only receive an id). |
| `rag/chunker.py` | `chunk_documents(chunks)` guarantees every chunk is `≤ MAX_CHARS`; `_split_oversized` does header-preserving, overlapping line splits. Constants `MAX_CHARS=1200`, `OVERLAP_CHARS=150`. |
| `rag/embedder.py` | `embed_texts(list) -> list[list[float]]` and `embed_text(str) -> list[float]`. Lazy, cached `SentenceTransformer`; normalized output. |
| `rag/retriever.py` | `retrieve(query, doc_id=None, top_k=5) -> list[RetrievedChunk]` — embeds, calls `match_api_documents`, maps rows to `RetrievedChunk` (with `similarity` set, `relevance` filled in later by the grader). |
| `agents/tools.py` | The four LLM building blocks plus scoring, and the `_MODE_FOCUS` framing table. Groq helpers (`_complete_json`, `_complete_text`), chunk formatting (`_format_chunks`), issue parsing (`_parse_issues`), summary writing (`_write_summary`), and the deterministic `_score`. |
| `agents/sentinel_agent.py` | Graph assembly, `run()`, `stream()`, the `_PIPELINE` node/label list (single source of truth for node order, streamed to the client), and per-node progress-detail builders. |
| `main.py` | The FastAPI app. CORS is wide-open (`allow_origins=["*"]` — tighten for production). Lifespan handler calls `settings.require()`. See [HTTP API](#http-api). |

---

## Data model

The backend Pydantic models (`backend/models/schemas.py`) are mirrored one-for-one in TypeScript (`frontend/lib/types.ts`), so the contract is typed end to end.

Enums:

```python
Severity   = CRITICAL | WARNING | PASS
ReviewMode = security | documentation | production | data_exposure | custom
```

Ingestion:

```python
Chunk           { content, section_type="general", endpoint_path? }
UploadResponse  { doc_id, file_name, chunk_count, section_types[] }
```

Review / agent I/O:

```python
ReviewRequest   { doc_id, question, mode=CUSTOM }
RetrievedChunk  { content, section_type, endpoint_path?, similarity=0.0, relevance=0.0 }
Issue           { severity, title, detail, location? }
CategoryScores  { security, documentation, completeness, best_practices }   # 0–100 each
Report          { doc_id, file_name, overall_score, category_scores, issues[], summary }
DeleteResponse  { deleted, doc_id }
```

The `RetrievedChunk` carries **two** scores: `similarity` (cosine, set at retrieval) and `relevance` (LLM grade 0–1, set by the grader). `endpoint_path` doubles as the display "location" for both endpoints (`GET /pets`) and schemas (the model name).

---

## HTTP API

Base URL is the FastAPI server (default `http://localhost:8000`).

| Method | Route | Body / Params | Returns |
| --- | --- | --- | --- |
| `GET` | `/health` | — | `{ "status": "ok" }` |
| `POST` | `/upload` | multipart `file` | `UploadResponse` — `{ doc_id, file_name, chunk_count, section_types[] }` |
| `POST` | `/review` | `{ doc_id, question, mode }` | **NDJSON stream** of events (see below) |
| `GET` | `/report/{doc_id}` | `?mode=` (default `production`) | one-shot scored `Report` |
| `DELETE` | `/document/{doc_id}` | — | `DeleteResponse` — `{ deleted, doc_id }` |

**Review modes** (`mode` field / `?mode=`): each steers the agent's focus via a framing sentence injected into the planner and analyzer prompts.

| Mode | Focus |
| --- | --- |
| `security` | auth/authz, transport (HTTPS), secrets, rate limiting, injection surfaces, missing security schemes |
| `documentation` | missing descriptions, undocumented params/responses, unclear examples, inconsistent naming |
| `production` | error handling, status codes, versioning, pagination, rate limiting, deprecation, observability |
| `data_exposure` | endpoints returning PII/sensitive fields, over-broad schemas, missing field-level access control, verbose error payloads |
| `custom` | answers the user's raw question directly, with no added lens |

**Error handling:** `/upload` returns `400` (empty/nameless file), `422` (`ValueError` — nothing extractable), or `500` (unexpected). `/review` returns `400` for a blank question; runtime failures inside the stream are emitted as an in-band `{"type":"error", …}` line rather than an HTTP error, so a partially-rendered trace still resolves cleanly on the client.

---

## Streaming protocol (NDJSON)

`POST /review` responds with `application/x-ndjson`: **one JSON object per line**. The client (`lib/api.ts::streamReview`) reads the body incrementally, buffers on newlines, and yields each parsed line as it arrives.

Event sequence: one `pipeline`, then one `progress` per completed node, then either one `report` or one `error`.

```jsonc
// 1) Sent once, before the graph runs — lets the UI render every step as pending.
{"type": "pipeline", "nodes": [
  {"node": "query_planner",    "label": "Planning sub-questions"},
  {"node": "retriever",        "label": "Retrieving relevant sections"},
  {"node": "relevance_grader", "label": "Grading relevance"},
  {"node": "analyzer",         "label": "Analyzing for issues"},
  {"node": "synthesizer",      "label": "Synthesizing report"}
]}

// 2) One per node, AFTER it completes. `detail` shape depends on `node`:
{"type": "progress", "node": "query_planner",    "label": "…", "detail": {"sub_questions": ["…"]}}
{"type": "progress", "node": "retriever",        "label": "…", "detail": {"retrieved": 12, "section_types": ["endpoint","auth"], "top_similarity": 0.83, "top_k": 5}}
{"type": "progress", "node": "relevance_grader", "label": "…", "detail": {"retrieved": 12, "kept": 7, "dropped": 5, "threshold": 0.5, "kept_chunks": [{"location": "GET /pets", "section_type": "endpoint", "relevance": 0.91}]}}
{"type": "progress", "node": "analyzer",         "label": "…", "detail": {"reasoning": "…", "missing": ["…"], "issue_count": 4, "severity_counts": {"CRITICAL": 1, "WARNING": 3, "PASS": 0}}}
{"type": "progress", "node": "synthesizer",      "label": "…", "detail": {"overall_score": 72}}

// 3) Terminal — the final report…
{"type": "report", "report": { /* Report */ }}
// …or an error, streamed in-band:
{"type": "error", "detail": "…"}
```

`kept_chunks` deliberately carries **locations only, never chunk content** — the stream stays light. Every `detail` field is optional at the wire boundary: an older backend can stream `progress` events with no `detail`, and the UI degrades to labels only. The frontend even reconstructs the pipeline shape from the events themselves if the `pipeline` event is absent, so a fresh Vercel build can talk to an older Render instance.

---

## Frontend reference

Next.js 14 App Router, TypeScript, Tailwind. Two routes and a small set of purpose-built components. All network access is isolated in `lib/api.ts`; the components stay declarative.

### Pages

- **`app/layout.tsx`** — root shell (sticky header with logo, centered `max-w-5xl` main, footer) and page metadata.
- **`app/page.tsx`** (`/`) — the **upload page**. A `Status` state machine (`idle → uploading → done → error`) drives the UI: it calls `uploadDocument`, shows the ingest progress + `ColdStartNotice`, then on success surfaces the chunk/section stats and a **Start review** button that routes to `/review?doc_id=…&file_name=…`.
- **`app/review/page.tsx`** (`/review`) — reads `doc_id` / `file_name` from the query string (wrapped in `Suspense` for `useSearchParams`), and mounts `ChatInterface`. Shows a "no document selected" fallback if `doc_id` is missing.

### Components

- **`FileUpload.tsx`** — drag-and-drop + click-to-browse picker. Validates extensions client-side against `.json, .yaml, .yml, .txt, .md, .pdf` (mirroring the backend parsers) before calling `onSelect`. Keyboard-operable (`role="button"`, Enter/Space).
- **`ChatInterface.tsx`** — the review driver. Four preset modes (Security, Documentation, Production readiness, Data exposure) as one-click buttons plus a free-form `custom` question box. Runs a `Phase` state machine (`idle → running → done → error`), consumes the `streamReview` async generator, appends each `progress` event to a `trace` array (timestamped with `performance.now()`), and guards against overlapping runs with a ref. Computes when the embedder is the likely cause of a stall to drive the cold-start notice.
- **`AgentTrace.tsx`** — the reasoning trace. Renders the pipeline as a vertical, connected step list; each step shows a status indicator (pending / running / done / failed), a duration, and a **node-specific payload**: the planner's sub-questions, the retriever's section-type tags + best match, the grader's `retrieved → kept` narrowing with per-chunk relevance, the analyzer's severity counts + reasoning + "not documented" list, the synthesizer's score. Disclosure follows the run (open while working, auto-collapses when the report lands) until the user takes over. Fully `aria-*`-wired with a polite live region.
- **`ReportCard.tsx`** — the final report: overall score in a ring (traffic-light color at 80/50 thresholds), four animated category bars, the Markdown summary, and issues **sorted by severity** (CRITICAL → WARNING → PASS) each with a `SecurityBadge` and monospace location.
- **`SecurityBadge.tsx`** — severity pill with icon and accessible label.
- **`ColdStartNotice.tsx`** — a two-stage explainer for the free-tier backend's cold start (see [Deployment](#deployment)). At `HEDGE_MS` (10s) it hedges ("taking longer than usual"); at `NAMED_MS` (45s) it names the cause ("loads a ~90 MB embedding model … a few minutes"). Timer-driven off the wait's real start, with a polite live region.

### `lib/`

- **`api.ts`** — `uploadDocument`, `deleteDocument`, and the `streamReview` async generator. `API_URL` comes from `NEXT_PUBLIC_API_URL` (trailing slash trimmed; defaults to `http://localhost:8000`). `ApiError` carries the HTTP status so the UI can branch on it.
- **`types.ts`** — the TypeScript mirror of the Pydantic contract, plus the full streaming-event union (`PipelineEvent | ProgressEvent | ReportEvent | ErrorEvent`) and every per-node `*Detail` shape.

---

## Design system

The visual system is documented in **[DESIGN.md](DESIGN.md)** and **[PRODUCT.md](PRODUCT.md)**; its machine-readable form lives in `frontend/tailwind.config.ts` and `.impeccable/design.json`. Highlights:

**Color** — a dark "ink" surface ramp (`ink-900 … ink-500`) with four measured **text roles** (every text color comes from these; raw `slate-*` is considered drift):

| Token | Hex | Contrast | Use |
| --- | --- | --- | --- |
| `bright` | `#f1f5f9` | 16.47:1 | headings, emphasized values |
| `body` | `#e2e8f0` | 14.63:1 | prose the user reads |
| `secondary` | `#94a3b8` | 7.04:1 | descriptions, supporting detail |
| `muted` | `#7c8ba1` | 5.21:1 | labels, locations, timings |

`accent` is **Signal Cyan** (`#38bdf8`), reserved to mean "live / this is the action" (the *One Voice* rule). Severity uses `critical` red, `warning` amber, `pass` green — reporting problems at the weight they're actually wrong, never as threat theater.

**Motion** — a small, deliberate set of keyframes (`rise-in` entrance, `pulse-status` / `signal-breathe` live signals, `draw-check` / `draw-line` step completion, `bar-grow` score bars) with named easing curves. The trace disclosure uses two pre-distorted `unfold`/`fold` curves because `grid-template-rows` `0fr↔1fr` interpolates *quadratically* in pixels. Every animation starts from its visible end state, so content is correct even if the animation never runs.

**Accessibility** — WCAG 2.2 AA is a non-negotiable. `prefers-reduced-motion` is a global floor (`globals.css`) that collapses all animation to its end state; live regions announce trace progress and cold-start state; the trace and upload are fully keyboard-operable.

---

## Configuration reference

### Environment variables

**Backend** (`backend/.env`, copy from `.env.example`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `GROQ_API_KEY` | Groq LLM access (**required**) | — |
| `GROQ_MODEL` | LLM model | `openai/gpt-oss-120b` |
| `SUPABASE_URL` | Supabase project URL (**required**) | — |
| `SUPABASE_KEY` | Supabase **service_role** key (**required**) | — |
| `EMBEDDING_MODEL` | sentence-transformers model | `all-MiniLM-L6-v2` |

> **Use the `service_role` (secret) key**, not a publishable/anon key — the backend writes to `api_documents` server-side and bypasses RLS. Keep it server-side only; never expose it to the frontend. The first review downloads the `all-MiniLM-L6-v2` model (~90 MB) into a gitignored cache.

**Frontend** (`frontend/.env.local`, copy from `frontend/.env.local.example`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |

### Tunables (in code)

| Constant | File | Value | Meaning |
| --- | --- | --- | --- |
| `EMBEDDING_DIM` | `config.py` | 384 | Vector dimension — **must** match `vector(384)` in SQL |
| `TOP_K` | `config.py` | 5 | Chunks retrieved per sub-question |
| `RELEVANCE_THRESHOLD` | `config.py` | 0.5 | Grader keep/drop cutoff (0–1) |
| `MAX_CHARS` | `rag/chunker.py` | 1200 | Max chunk size before splitting |
| `OVERLAP_CHARS` | `rag/chunker.py` | 150 | Overlap carried between sub-chunks |
| `_INSERT_BATCH` | `rag/pipeline.py` | 100 | Rows per Supabase insert |
| `crit_penalty` / `warn_penalty` | `agents/tools.py` | 25 / 8 | Per-issue score deductions |
| missing-gap penalty | `agents/tools.py` | 5 each, cap 40 | Completeness deduction per undocumented gap |
| `HEDGE_MS` / `NAMED_MS` | `ColdStartNotice.tsx` | 10s / 45s | Cold-start notice escalation thresholds |

---

## Database schema

Run [`supabase_setup.sql`](supabase_setup.sql) in the Supabase SQL editor **before** starting the backend. It enables the `vector` extension (pgvector), creates the `api_documents` table, adds the indexes, and defines the retrieval RPC.

The `api_documents` table:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` |
| `doc_id` | `uuid` | groups all chunks of one upload (indexed) |
| `file_name` | `text` | original name |
| `section_type` | `text` | `info` / `auth` / `endpoint` / `schema` / `text` / … |
| `endpoint_path` | `text` | `METHOD /path` or schema name |
| `content` | `text` | the chunk text |
| `embedding` | `vector(384)` | normalized MiniLM embedding |
| `created_at` | `timestamp` | `now()` |

**Indexes:** an `ivfflat` index on `embedding` using `vector_cosine_ops` for approximate nearest-neighbour search, plus a btree index on `doc_id`.

**RPC:** `match_api_documents(query_embedding, match_count=5, filter_doc_id=null)` returns the closest chunks (optionally scoped to one `doc_id`) with `similarity = 1 - (embedding <=> query_embedding)`.

> If you change the embedding model to a different dimension, update `EMBEDDING_DIM` in `config.py` **and** every `vector(384)` in this file (column + RPC signature).

---

## Running locally

**Prerequisites:** Python 3.12.x, Node 18+ (Next.js 14), a Supabase project, a Groq API key.

### 1. Database

Run [`supabase_setup.sql`](supabase_setup.sql) in the Supabase SQL editor (see [Database schema](#database-schema)).

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp ../.env.example .env    # then fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY
uvicorn main:app --reload --port 8000
```

The server fails fast at startup if a required secret is missing. The first review downloads the ~90 MB embedding model into a gitignored cache.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local    # set NEXT_PUBLIC_API_URL (default http://localhost:8000)
npm install
npm run dev                          # http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`.

---

## Deployment

**API Sentinel AI is deployed live at [api-sentinel-ai.vercel.app](https://api-sentinel-ai.vercel.app/).**

The frontend is hosted on **Vercel**, the backend runs on **Render** (Python 3.12.8, pinned via `.python-version`), and **Supabase** hosts the Postgres + pgvector database.

### ⚠️ Free-tier limitation: local embeddings

Embeddings are computed **in-process** with sentence-transformers **`all-MiniLM-L6-v2`** (384-dim, normalized). The backend imports PyTorch and downloads the ~90 MB model on first use — which **does not work well on free-tier hosting**:

- **Memory** — Render's free instances have 512 MB RAM; loading torch + the model routinely exceeds that and the process is OOM-killed mid-request.
- **Cold starts** — free instances spin down when idle. Every wake re-loads (and may re-download) the model, so the first upload/review can take minutes or time out. (This is exactly what `ColdStartNotice` exists to explain to the user.)
- **CPU-only inference** — embedding a large spec chunk-by-chunk is slow without a beefier instance.

**Options:**

1. **Paid instance** — anything with ≥ 2 GB RAM (e.g. Render Standard) runs the model comfortably.
2. **Hosted embeddings API** — swap `backend/rag/embedder.py` for a remote provider so the backend stays lightweight. If the new model isn't 384-dim, update `EMBEDDING_DIM` in `config.py` **and** the `vector(384)` column + RPC in `supabase_setup.sql`.

Also tighten CORS (`main.py` currently allows all origins) for a real deployment.

---

## Quick test

```bash
# with the backend running:
DOC=$(curl -s -F "file=@backend/samples/petstore.json" http://localhost:8000/upload | python -c "import sys,json;print(json.load(sys.stdin)['doc_id'])")

curl -N -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d "{\"doc_id\":\"$DOC\",\"question\":\"Review this API for security issues.\",\"mode\":\"security\"}"
```

Two sample specs ship in `backend/samples/`: `petstore.json` (Swagger 2.0) and `taskflow.json` (OpenAPI 3.0.3, intentionally imperfect so a review surfaces real findings). Or use the UI: open <http://localhost:3000>, drop in a spec, and click **Start review**.

---

## Design principles

From [PRODUCT.md](PRODUCT.md) — the product exists to demonstrate *legible* agent reasoning, so its five principles are load-bearing on the engineering:

1. **The trace is the product, not a loading state.** The five nodes get the design attention normally reserved for the result — hence per-node payloads, not a spinner.
2. **Trust is earned through legibility.** Every claim in the report is inspectable; where a choice exists between explaining and asserting, explain.
3. **Severity without theater.** Report what's wrong at the weight it's actually wrong — ranking and clarity, never alarm.
4. **Unhurried precision.** Calm is a feature; never simulate urgency (the cold-start notice hedges before it names).
5. **Built for the second look.** The audience inspects devtools, markup, tab order — craft has to survive scrutiny.

And the engineering choices those imply:

- **Semantic-boundary-first chunking** — parsers emit whole units (one endpoint, one schema); the chunker only splits a unit if it overflows `MAX_CHARS`, so retrieval never returns half an operation.
- **Server-side vector search** — cosine similarity runs in Postgres via `match_api_documents`.
- **Deterministic scoring, LLM reasoning** — the LLM finds and describes issues; a rule-based scorer turns them into reproducible numbers.
- **Graceful degradation** — invalid OpenAPI falls back to text parsing; text parsing falls back to a single chunk; unparseable LLM output falls back to `{}`; a bad progress detail can't crash the review; a missing `pipeline` event is reconstructed client-side.
- **Typed contracts end to end** — Pydantic models on the backend, mirrored by `frontend/lib/types.ts`.

---

## Extending the system

- **Swap the embedding model / provider** — edit `rag/embedder.py`. If the dimension changes, update `EMBEDDING_DIM` (`config.py`) and every `vector(384)` in `supabase_setup.sql`.
- **Add a review mode** — add a member to `ReviewMode` (`models/schemas.py`), a focus sentence to `_MODE_FOCUS` (`agents/tools.py`), the matching string-literal union in `lib/types.ts`, and (optionally) a preset button in `ChatInterface.tsx`.
- **Add a parser / file type** — add a branch in `rag/pipeline.py::parse_file`, a parser module producing `Chunk`s, and the extension to `ACCEPTED` in `FileUpload.tsx`.
- **Tune retrieval / scoring** — the knobs live in `config.py` (`TOP_K`, `RELEVANCE_THRESHOLD`) and `agents/tools.py` (penalties, keyword routing).
- **Change the LLM** — set `GROQ_MODEL`, or replace the `_complete_json` / `_complete_text` helpers in `agents/tools.py` to point at a different provider.
