-- 0012: account-wide (global) budget caps layered on the per-user limits from 0011.
-- Bounds total spend even when many users each stay under their personal limit. The BigQuery
-- monthly cap is set to stay inside the 1 TiB/month free tier, so live search never bills.
-- Reuses the api_usage table; global kinds (e.g. bq_global_month) are counted across all users.

create or replace function public.consume_global_limit(
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
    where kind = p_kind
      and created_at > now() - make_interval(secs => p_window_secs);
  if cnt >= p_limit then
    return false;
  end if;
  insert into public.api_usage (user_id, kind) values (uid, p_kind);
  return true;
end;
$$;

revoke all on function public.consume_global_limit(text, int, int) from public, anon;
grant execute on function public.consume_global_limit(text, int, int) to authenticated;
