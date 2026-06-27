-- Pincite Phase 4: findings (flagged issues in the user's draft, roadmap §3, §4.3).
-- Apply: node --env-file=.env.local scripts/db-apply.mjs supabase/migrations/0005_phase4_findings.sql
-- then: notify pgrst, 'reload schema'

do $$ begin
  create type public.finding_severity as enum ('violation', 'attention', 'pass');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.finding_kind as enum ('structural', 'consistency', 'substantive');
exception when duplicate_object then null; end $$;

create table if not exists public.findings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  version_id  uuid,
  section_key public.section_key not null,
  span_start  integer not null default 0,
  span_end    integer not null default 0,
  severity    public.finding_severity not null,
  kind        public.finding_kind not null,
  actionable  boolean not null default true,
  title       text not null,
  explanation text not null,
  mpep_section text,   -- pinned MPEP section, validated against the corpus before display
  cfr_ref      text,   -- display-only statute/regulation reference
  created_at  timestamptz not null default now()
);
create index if not exists findings_project_idx on public.findings (project_id);

alter table public.findings enable row level security;

drop policy if exists "findings_select_own" on public.findings;
create policy "findings_select_own" on public.findings for select
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "findings_insert_own" on public.findings;
create policy "findings_insert_own" on public.findings for insert
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "findings_delete_own" on public.findings;
create policy "findings_delete_own" on public.findings for delete
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
