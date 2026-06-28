-- Pincite Phase 8: exports audit record (roadmap §3, §9).
-- Apply: node --env-file=.env.local scripts/db-apply.mjs supabase/migrations/0006_phase8_exports.sql
-- then: notify pgrst, 'reload schema'

create table if not exists public.exports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  version_id uuid,
  format     text not null check (format in ('pdf', 'txt')),
  created_at timestamptz not null default now()
);
create index if not exists exports_project_idx
  on public.exports (project_id, created_at desc);

alter table public.exports enable row level security;

drop policy if exists "exports_select_own" on public.exports;
create policy "exports_select_own" on public.exports
  for select using (auth.uid() = user_id);
drop policy if exists "exports_insert_own" on public.exports;
create policy "exports_insert_own" on public.exports for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.projects p
                where p.id = project_id and p.user_id = auth.uid())
  );
