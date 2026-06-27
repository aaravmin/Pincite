-- Pincite Phase 1 schema: projects + structured sections + append-only versions.
-- Apply in the Supabase SQL editor, or via `supabase db push` once the CLI is linked.
-- Idempotent-ish: IF NOT EXISTS / CREATE OR REPLACE / guarded enum creation.

-- ----------------------------------------------------------------------------
-- Enums (roadmap §3): patent type, declared status, section keys (the §4.1 parts).
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.patent_type as enum ('utility', 'design', 'plant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum
    ('drafting', 'filed', 'published', 'office_action', 'allowed', 'granted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.section_key as enum (
    'title', 'cross_reference', 'gov_interest', 'background', 'summary',
    'brief_description_drawings', 'detailed_description', 'claims', 'abstract',
    'drawings_meta', 'office_action'
  );
exception when duplicate_object then null; end $$;

-- Shared updated_at trigger function.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- projects: one in-progress patent per row. RLS: owner-only.
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  patent_type        public.patent_type   not null default 'utility',
  declared_status    public.project_status not null default 'drafting',
  application_number text,
  filing_date        date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists projects_user_id_updated_at_idx
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- project_sections: the structured draft, one row per §4.1 part. Content is a
-- raw plain-text string so character offsets stay stable for later highlights.
-- RLS via project ownership.
-- ----------------------------------------------------------------------------
create table if not exists public.project_sections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  section_key public.section_key not null,
  content     text not null default '',
  word_count  integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique (project_id, section_key)
);

create index if not exists project_sections_project_id_idx
  on public.project_sections (project_id);

alter table public.project_sections enable row level security;

drop policy if exists "sections_select_own" on public.project_sections;
create policy "sections_select_own" on public.project_sections for select
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "sections_insert_own" on public.project_sections;
create policy "sections_insert_own" on public.project_sections for insert
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "sections_update_own" on public.project_sections;
create policy "sections_update_own" on public.project_sections for update
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "sections_delete_own" on public.project_sections;
create policy "sections_delete_own" on public.project_sections for delete
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));

drop trigger if exists sections_touch_updated_at on public.project_sections;
create trigger sections_touch_updated_at before update on public.project_sections
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- project_versions: immutable snapshot on every save (roadmap §8). Append-only:
-- insert + select policies only, so the client can never overwrite history.
-- Restore opens an old snapshot into a NEW row; branch via parent_version_id.
-- ----------------------------------------------------------------------------
create table if not exists public.project_versions (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  label             text,
  snapshot          jsonb not null,
  parent_version_id uuid references public.project_versions (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists project_versions_project_id_created_at_idx
  on public.project_versions (project_id, created_at desc);

alter table public.project_versions enable row level security;

drop policy if exists "versions_select_own" on public.project_versions;
create policy "versions_select_own" on public.project_versions
  for select using (auth.uid() = user_id);
drop policy if exists "versions_insert_own" on public.project_versions;
create policy "versions_insert_own" on public.project_versions
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.projects p
                where p.id = project_id and p.user_id = auth.uid())
  );
-- No update or delete policy: snapshots are immutable from the client (append-only).
