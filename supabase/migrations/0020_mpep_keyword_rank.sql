-- Locate quality: the keyword fallback used .textSearch(...).limit() with NO relevance
-- ordering, so it returned matching rows in physical table order - which is why broad
-- catch-all sections (101 "General", 103 "Right of Public To Inspect", 502.05 "EFS-Web")
-- came back for almost every question. This adds a RANKED keyword RPC (ts_rank desc) and
-- drops [Reserved] placeholders + near-empty "[top]" stubs from both locate paths so the
-- real governing section wins. Apply:
--   node --env-file=.env.local scripts/db-apply.mjs supabase/migrations/0020_mpep_keyword_rank.sql
-- then: notify pgrst, 'reload schema'

-- Ranked full-text locate: best-matching real sections first. websearch ts_rank saturates
-- at 1.0 for many sections, so on a tie prefer the one whose TITLE matches the query (a
-- section titled "Information Disclosure Statement" should beat a 90k-char term-adjustment
-- section that merely mentions IDS), then the shorter/more specific one. This keeps the
-- broad catch-all sections (101 "General", 2732) from winning by sheer size.
create or replace function public.match_mpep_keyword(
  search_query text,
  match_count integer default 6
)
returns table (section_number text, title text, rank real)
language sql
stable
as $$
  select s.section_number,
         s.title,
         ts_rank(s.fts, websearch_to_tsquery('english', search_query)) as rank
  from public.mpep_sections s
  where s.fts @@ websearch_to_tsquery('english', search_query)
    and length(s.full_text) >= 30
    and coalesce(s.title, '') not ilike '%[reserved]%'
  order by
    ts_rank(s.fts, websearch_to_tsquery('english', search_query)) desc,
    ts_rank(
      to_tsvector('english', coalesce(s.title, '')),
      websearch_to_tsquery('english', search_query)
    ) desc,
    length(s.full_text) asc
  limit match_count;
$$;

-- Semantic locate: same hygiene - never surface a [Reserved] placeholder or a "[top]"
-- stub (5 chars) as a candidate or an alternative.
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
    and length(s.full_text) >= 30
    and coalesce(s.title, '') not ilike '%[reserved]%'
  group by s.section_number, s.title
  order by similarity desc
  limit match_count;
$$;
