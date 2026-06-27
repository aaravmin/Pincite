-- Pincite Phase 0 schema: profiles (with consent) + append-only audit_log.
-- Run in the Supabase SQL editor, or via `supabase db push`. Idempotent-ish:
-- uses IF NOT EXISTS / CREATE OR REPLACE so re-running is safe.

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user. Holds confidentiality consent timestamp.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  consented_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- audit_log: append-only record of meaningful actions (roadmap §3, §8).
-- Users may insert and read their OWN rows. No update/delete policy => immutable
-- from the client. The service role bypasses RLS for server-side maintenance.
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  project_id  uuid,
  version_id  uuid,
  action      text not null,
  detail      jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_user_id_created_at_idx
  on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "audit_select_own" on public.audit_log;
create policy "audit_select_own" on public.audit_log
  for select using (auth.uid() = user_id);

drop policy if exists "audit_insert_own" on public.audit_log;
create policy "audit_insert_own" on public.audit_log
  for insert with check (auth.uid() = user_id);
