-- WashFlow dashboard read API (Supabase/Postgres).
-- T1c: the read-only web dashboard reads the sync mirror through a single
-- security-definer RPC. Only managers and admins may call it; cashiers/washers
-- are denied (revenue and cross-role data are manager+ per the product brief).
--
-- This mirrors the security posture of sync.sql: direct table access to
-- sync_mirror is revoked, and every read goes through a definer function that
-- enforces the role gate itself.

-- Role gate: managers and admins may read the dashboard snapshot.
create or replace function public.is_dashboard_reader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'manager');
$$;

-- Returns every non-tombstoned mirror row with server_seq > p_after_seq,
-- newest first. The client builds its queue/revenue views from these rows.
create or replace function public.dashboard_snapshot(p_after_seq bigint default 0)
returns table (entity text, entity_id text, row jsonb, server_seq bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_dashboard_reader() then
    raise exception 'manager or admin role required';
  end if;

  return query
    select m.entity, m.entity_id, m.row, m.server_seq
    from public.sync_mirror m
    where m.server_seq > p_after_seq
      and (m.row ->> 'deleted_at') is null
    order by m.server_seq desc;
end;
$$;

grant execute on function public.dashboard_snapshot(bigint) to authenticated;
