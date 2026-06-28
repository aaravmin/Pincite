-- v3.2: semantic MPEP locate. Nearest-neighbour over the embedded chunks (voyage-law-2,
-- 1024-dim, HNSW cosine index), returning the best-scoring section for a query embedding.
-- Runs as the caller, so the authenticated read policy on the corpus still applies.
create or replace function public.match_mpep_chunks(
  query_embedding vector(1024),
  match_count integer default 6
)
returns table (section_number text, title text, similarity double precision)
language sql
stable
as $$
  select s.section_number,
         s.title,
         max(1 - (c.embedding <=> query_embedding)) as similarity
  from public.mpep_chunks c
  join public.mpep_sections s on s.id = c.section_id
  where c.embedding is not null
  group by s.section_number, s.title
  order by similarity desc
  limit match_count;
$$;
