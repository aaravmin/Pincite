-- Pincite Phase 2: MPEP corpus (public reference data) + pgvector embeddings.
-- Apply: node --env-file=.env.local scripts/db-apply.mjs supabase/migrations/0003_phase2_mpep_corpus.sql
-- then: notify pgrst, 'reload schema'

create extension if not exists vector with schema extensions;
set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- mpep_sections: one row per citable (sub)section, e.g. "2111.03", "608.01(b)".
-- Public reference data, shared across users. full_text is the canonical section
-- text; findings/rules pin to section_number and the evidence pane loads full_text.
-- ----------------------------------------------------------------------------
create table if not exists public.mpep_sections (
  id             uuid primary key default gen_random_uuid(),
  section_number text not null unique,
  title          text,
  chapter        text,
  revision_tag   text,
  edition        text not null,
  source_url     text not null,
  full_text      text not null,
  fetched_at     timestamptz not null default now()
);

create index if not exists mpep_sections_number_idx
  on public.mpep_sections (section_number);

-- Keyword/full-text search for the "locate" step (alongside vector search).
alter table public.mpep_sections
  add column if not exists fts tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(full_text, ''))
  ) stored;
create index if not exists mpep_sections_fts_idx
  on public.mpep_sections using gin (fts);

-- ----------------------------------------------------------------------------
-- mpep_chunks: chunked section text with a voyage-law-2 (1024-dim) embedding.
-- ----------------------------------------------------------------------------
create table if not exists public.mpep_chunks (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.mpep_sections (id) on delete cascade,
  chunk_index integer not null,
  content     text not null,
  embedding   vector(1024),
  created_at  timestamptz not null default now(),
  unique (section_id, chunk_index)
);

create index if not exists mpep_chunks_section_idx
  on public.mpep_chunks (section_id);
-- Approximate-nearest-neighbour index for cosine similarity (semantic locate).
create index if not exists mpep_chunks_embedding_idx
  on public.mpep_chunks using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- RLS: corpus is public reference data — any authenticated user may read; only the
-- service role (which bypasses RLS) writes during ingestion. No write policies.
-- ----------------------------------------------------------------------------
alter table public.mpep_sections enable row level security;
alter table public.mpep_chunks enable row level security;

drop policy if exists "mpep_sections_read" on public.mpep_sections;
create policy "mpep_sections_read" on public.mpep_sections
  for select to authenticated using (true);

drop policy if exists "mpep_chunks_read" on public.mpep_chunks;
create policy "mpep_chunks_read" on public.mpep_chunks
  for select to authenticated using (true);
