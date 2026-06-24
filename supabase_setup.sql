-- Run this in the Supabase SQL editor before starting the backend.

create extension if not exists vector;

create table if not exists api_documents (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  section_type text,
  endpoint_path text,
  content text,
  embedding vector(384),
  created_at timestamp default now()
);

create index if not exists api_documents_embedding_idx
  on api_documents using ivfflat (embedding vector_cosine_ops);

-- Cosine-similarity match function used by the retriever.
-- Returns the closest chunks for a given query embedding, optionally
-- scoped to a single uploaded document (file_name acts as the doc grouping).
create or replace function match_api_documents(
  query_embedding vector(384),
  match_count int default 5,
  filter_file_name text default null
)
returns table (
  id uuid,
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
    d.file_name,
    d.section_type,
    d.endpoint_path,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from api_documents d
  where filter_file_name is null or d.file_name = filter_file_name
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
