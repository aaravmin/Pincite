-- v3: invention disclosure — the plain-language technical intake (separate from the formal
-- 1.77 specification). One row per project; cross-referenced against the spec/claims.
create table if not exists public.project_disclosure (
  project_id      uuid primary key references public.projects (id) on delete cascade,
  field_industry  text not null default '',
  problem_solved  text not null default '',
  how_it_works    text not null default '',
  components      text not null default '',
  advantages      text not null default '',
  alternatives    text not null default '',
  known_prior_art text not null default '',
  updated_at      timestamptz not null default now()
);

alter table public.project_disclosure enable row level security;

drop policy if exists "disclosure_select_own" on public.project_disclosure;
create policy "disclosure_select_own" on public.project_disclosure for select
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "disclosure_insert_own" on public.project_disclosure;
create policy "disclosure_insert_own" on public.project_disclosure for insert
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "disclosure_update_own" on public.project_disclosure;
create policy "disclosure_update_own" on public.project_disclosure for update
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
