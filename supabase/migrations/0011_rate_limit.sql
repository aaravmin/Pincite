-- 0011: server-enforced per-user rate limiting for paid/expensive endpoints.
-- Protects the BigQuery live search (~$0.82/scan), Grok text + vision, and Voyage embed
-- calls from economic abuse. The limit is checked and the call recorded atomically in one
-- round trip via consume_rate_limit(). The table is NOT user-writable (only the security
-- definer function and the service role write it), so a client cannot reset its own quota.

create table if not exists public.api_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_user_kind_time
  on public.api_usage (user_id, kind, created_at desc);

alter table public.api_usage enable row level security;

-- A user may read their own usage (e.g. to show remaining quota). There is deliberately no
-- insert/update/delete policy for users: writes happen only through consume_rate_limit() or
-- the service role, so quota cannot be tampered with from the client.
drop policy if exists api_usage_select_own on public.api_usage;
create policy api_usage_select_own on public.api_usage
  for select using (auth.uid() = user_id);

-- Atomic check-and-consume. Returns true and records the call when the caller is under the
-- per-window limit for this kind, false otherwise. auth.uid() resolves the caller even under
-- security definer (it reads the request JWT claim, not the function owner).
create or replace function public.consume_rate_limit(
  p_kind text,
  p_limit int,
  p_window_secs int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cnt int;
begin
  if uid is null then
    return false;
  end if;
  select count(*) into cnt
    from public.api_usage
    where user_id = uid
      and kind = p_kind
      and created_at > now() - make_interval(secs => p_window_secs);
  if cnt >= p_limit then
    return false;
  end if;
  insert into public.api_usage (user_id, kind) values (uid, p_kind);
  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int) from public, anon;
grant execute on function public.consume_rate_limit(text, int, int) to authenticated;
