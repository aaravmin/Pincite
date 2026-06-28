-- Pincite v3 schema (0007): user roles + attorney portfolio, inventors/applicant (ADS),
-- inventor declarations (append-only), and file attachments (bytes live in Storage).
-- RLS owner-scoped, mirroring 0002. Idempotent-ish: IF NOT EXISTS / guarded enums.

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('attorney', 'inventor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.entity_status as enum ('large', 'small', 'micro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attachment_kind as enum ('drawing', 'supporting');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- B. Roles + attorney portfolio.
-- profiles.role is null until the user self-selects after consent.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role public.user_role;

alter table public.projects
  add column if not exists applicant_name        text,
  add column if not exists applicant_is_inventor boolean not null default true,
  add column if not exists applicant_is_juristic boolean not null default false,
  add column if not exists entity_status         public.entity_status not null default 'large',
  add column if not exists client_name           text,
  add column if not exists matter_no             text;

-- ----------------------------------------------------------------------------
-- C. Inventors (the ADS / PTO-AIA-14 inventor rows). RLS via project ownership.
-- ----------------------------------------------------------------------------
create table if not exists public.project_inventors (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  legal_name      text not null default '',
  residence       text not null default '',   -- city + state/country
  mailing_address text not null default '',
  citizenship     text not null default '',
  ord             integer not null default 0, -- inventor order on the ADS
  created_at      timestamptz not null default now()
);

create index if not exists project_inventors_project_id_idx
  on public.project_inventors (project_id, ord);

alter table public.project_inventors enable row level security;

drop policy if exists "inventors_select_own" on public.project_inventors;
create policy "inventors_select_own" on public.project_inventors for select
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "inventors_insert_own" on public.project_inventors;
create policy "inventors_insert_own" on public.project_inventors for insert
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "inventors_update_own" on public.project_inventors;
create policy "inventors_update_own" on public.project_inventors for update
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "inventors_delete_own" on public.project_inventors;
create policy "inventors_delete_own" on public.project_inventors for delete
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- D. Inventor declarations (37 CFR 1.63 / PTO-AIA-01). Append-only: select +
-- insert policies only, so a recorded attestation is immutable from the client.
-- `statements` holds the five required checks (made_or_authorized, original_inventor,
-- reviewed_understood, duty_to_disclose, penalty_acknowledged) as booleans.
-- ----------------------------------------------------------------------------
create table if not exists public.project_declarations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  inventor_id uuid references public.project_inventors (id) on delete set null,
  legal_name  text not null,
  statements  jsonb not null default '{}'::jsonb,
  signed_at   timestamptz not null default now()
);

create index if not exists project_declarations_project_id_idx
  on public.project_declarations (project_id, signed_at desc);

alter table public.project_declarations enable row level security;

drop policy if exists "declarations_select_own" on public.project_declarations;
create policy "declarations_select_own" on public.project_declarations for select
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "declarations_insert_own" on public.project_declarations;
create policy "declarations_insert_own" on public.project_declarations for insert
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
-- No update or delete policy: declarations are immutable from the client (append-only).

-- ----------------------------------------------------------------------------
-- C. Attachments. Metadata only; the bytes live in the US-region Storage bucket
-- `project-files` (private, per-owner RLS configured on storage.objects separately).
-- ----------------------------------------------------------------------------
create table if not exists public.project_attachments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  kind         public.attachment_kind not null default 'drawing',
  storage_path text not null,
  filename     text not null,
  mime         text not null default '',
  size_bytes   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists project_attachments_project_id_idx
  on public.project_attachments (project_id, created_at desc);

alter table public.project_attachments enable row level security;

drop policy if exists "attachments_select_own" on public.project_attachments;
create policy "attachments_select_own" on public.project_attachments for select
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "attachments_insert_own" on public.project_attachments;
create policy "attachments_insert_own" on public.project_attachments for insert
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and p.user_id = auth.uid()));
drop policy if exists "attachments_delete_own" on public.project_attachments;
create policy "attachments_delete_own" on public.project_attachments for delete
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.user_id = auth.uid()));
