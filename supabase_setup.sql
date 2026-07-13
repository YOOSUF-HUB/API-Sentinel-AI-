-- Run this in the Supabase SQL editor before starting the backend.
-- This sets up the database schema for storing API documentation chunks and their embeddings.
create extension if not exists vector;

create table if not exists api_documents (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null,
  file_name text,
  section_type text,
  endpoint_path text,
  content text,
  embedding vector(384),
  created_at timestamp default now()
);

-- Group all chunks of one upload by doc_id.
create index if not exists api_documents_doc_id_idx on api_documents (doc_id);

-- Approximate-nearest-neighbor index for cosine similarity.
create index if not exists api_documents_embedding_idx
  on api_documents using ivfflat (embedding vector_cosine_ops);

-- Cosine-similarity match function used by the retriever.
-- Returns the closest chunks for a given query embedding, optionally
-- scoped to a single uploaded document via doc_id.
create or replace function match_api_documents(
  query_embedding vector(384),
  match_count int default 5,
  filter_doc_id uuid default null
)
returns table (
  id uuid,
  doc_id uuid,
  file_name text,
  section_type text,
  endpoint_path text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    d.id,
    d.doc_id,
    d.file_name,
    d.section_type,
    d.endpoint_path,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from api_documents d
  where filter_doc_id is null or d.doc_id = filter_doc_id
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
