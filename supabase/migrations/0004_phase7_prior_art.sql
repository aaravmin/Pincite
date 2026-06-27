-- Pincite Phase 7: prior-art matches + pinpoint overlap spans (roadmap §3, §4.6).
-- Apply: node --env-file=.env.local scripts/db-apply.mjs supabase/migrations/0004_phase7_prior_art.sql
-- then: notify pgrst, 'reload schema'

do $$ begin
  create type public.prior_art_source as enum ('google_patents', 'uspto_odp', 'patentsview');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.overlap_type as enum ('lexical', 'semantic', 'claim_limitation');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- prior_art_matches: one similar public patent for a project. overall_score is a
-- transparent composite (see match_spans); never presented as a verdict.
-- ----------------------------------------------------------------------------
create table if not exists public.prior_art_matches (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  version_id    uuid,
  patent_number text not null,
  title         text,
  source        public.prior_art_source not null,
  source_url    text,
  overall_score double precision,
  created_at    timestamptz not null default now()
);
create index if not exists prior_art_matches_project_idx
  on public.prior_art_matches (project_id, created_at desc);

-- ----------------------------------------------------------------------------
-- match_spans: pinpoint overlaps inside one match — what makes the score defensible.
-- ----------------------------------------------------------------------------
create table if not exists public.match_spans (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid not null references public.prior_art_matches (id) on delete cascade,
  user_section_key public.section_key not null,
  user_span_start  integer not null,
  user_span_end    integer not null,
  patent_span_text text not null,
  overlap_type     public.overlap_type not null,
  element_confidence double precision,
  created_at       timestamptz not null default now()
);
create index if not exists match_spans_match_idx on public.match_spans (match_id);

-- ----------------------------------------------------------------------------
-- RLS: user-scoped via project ownership (matches Phase 1 section policies).
-- ----------------------------------------------------------------------------
alter table public.prior_art_matches enable row level security;
alter table public.match_spans enable row level security;

drop policy if exists "pam_select_own" on public.prior_art_matches;
create policy "pam_select_own" on public.prior_art_matches for select
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "pam_insert_own" on public.prior_art_matches;
create policy "pam_insert_own" on public.prior_art_matches for insert
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "pam_delete_own" on public.prior_art_matches;
create policy "pam_delete_own" on public.prior_art_matches for delete
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));

drop policy if exists "ms_select_own" on public.match_spans;
create policy "ms_select_own" on public.match_spans for select
  using (exists (select 1 from public.prior_art_matches m
                 join public.projects p on p.id = m.project_id
                 where m.id = match_id and p.user_id = auth.uid()));
drop policy if exists "ms_insert_own" on public.match_spans;
create policy "ms_insert_own" on public.match_spans for insert
  with check (exists (select 1 from public.prior_art_matches m
                      join public.projects p on p.id = m.project_id
                      where m.id = match_id and p.user_id = auth.uid()));
drop policy if exists "ms_delete_own" on public.match_spans;
create policy "ms_delete_own" on public.match_spans for delete
  using (exists (select 1 from public.prior_art_matches m
                 join public.projects p on p.id = m.project_id
                 where m.id = match_id and p.user_id = auth.uid()));
