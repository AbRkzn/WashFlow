-- WashFlow sync mirror (Supabase/Postgres).
-- P8a: server-assigned sequence + full-row mirror + pull-by-sequence.
-- P8b: first-write-wins for job claims and appointment slots, with typed
--      conflict responses (`{ok:false, code}`) that the client settles instead
--      of retrying, then routes to the Manager conflict-review queue.
--
-- Design notes:
--   * `sync_seq` is the single server-assigned sequence. The client NEVER uses
--     device clocks for ordering — every synced row gets a strictly increasing
--     `server_seq`, and pull is `where server_seq > last_pulled`.
--   * `sync_mirror` stores one row per (entity, entity_id) with the full row as
--     JSONB. Every column is present (column parity with the local Drizzle
--     schema), so the mirror is lossless; it just happens to be column-typed
--     JSON rather than discrete columns. Tombstones propagate: a soft-deleted
--     row is pushed with `deleted_at` set and stays in the mirror.
--   * `sync_upsert` runs `security definer` and is atomic: advisory locks
--     serialize concurrent pushes for the same row (claims) or the same slot,
--     so first-write-wins is enforced even across simultaneous devices.
--   * Access is only through the two RPC functions; direct table access is
--     revoked (definer functions bypass RLS because their owner is postgres).

create sequence if not exists public.sync_seq;

create table if not exists public.sync_mirror (
  entity text not null,
  entity_id text not null,
  row jsonb not null,
  server_seq bigint not null,
  updated_at timestamptz not null default now(),
  primary key (entity, entity_id)
);

create unique index if not exists sync_mirror_server_seq_idx on public.sync_mirror (server_seq);
create index if not exists sync_mirror_seq_scan_idx on public.sync_mirror (server_seq);

-- Entities the engine will accept. Keep in sync with src/sync/entities.ts.
create or replace function public.sync_accepts_entity(p_entity text)
returns boolean
language sql
immutable
as $$
  select p_entity in (
    'customer', 'vehicle', 'service', 'job', 'payment', 'void_request',
    'appointment', 'expense', 'day_close', 'inventory_item', 'stock_adjustment',
    'service_inventory_item',
    'photo', 'recent_plate', 'setting', 'user'
  );
$$;

-- Pushes one full row. Returns `{ok:true, server_seq}` on success, or
-- `{ok:false, code, message}` when the server settled a first-write-wins
-- conflict against a concurrent device.
create or replace function public.sync_upsert(p_entity text, p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text;
  v_seq bigint;
  v_claim_status text;
  v_claim_assigned text;
begin
  if not public.sync_accepts_entity(p_entity) then
    raise exception 'unknown sync entity: %', p_entity;
  end if;

  v_entity_id := coalesce(p_row ->> 'id', p_row ->> 'key', '');
  if v_entity_id = '' then
    raise exception 'sync row missing id/key';
  end if;

  -- P8b: first-claim-wins — a job claimed by a different device is rejected.
  if p_entity = 'job'
     and coalesce(p_row ->> 'deleted_at', '') = ''
     and p_row ->> 'status' = 'assigned'
     and p_row ->> 'assigned_to' is not null then
    -- Serialize concurrent claims on the same job.
    perform pg_advisory_xact_lock(hashtextextended('job:' || v_entity_id, 0));
    select m.row ->> 'status', m.row ->> 'assigned_to'
      into v_claim_status, v_claim_assigned
      from public.sync_mirror m
     where m.entity = 'job' and m.entity_id = v_entity_id;

    if v_claim_status = 'assigned'
       and v_claim_assigned is distinct from p_row ->> 'assigned_to' then
      return jsonb_build_object(
        'ok', false,
        'code', 'job_claimed',
        'message', 'This job was already claimed by another washer.'
      );
    end if;
  end if;

  -- P8b + T2b: first-write-wins for appointment times. Windows overlap when
  -- `a_start < b_end and b_start < a_end`; the loser is auto-reflowed client-side.
  if p_entity = 'appointment'
     and coalesce(p_row ->> 'deleted_at', '') = ''
     and p_row ->> 'status' = 'booked' then
    -- NOTE: use concat() here, not ||-chained with ->> . Postgres gives `||`
    -- and `->>` the same operator precedence (left-associative), so
    -- `'appointment:' || p_row ->> 'date'` parses as `('appointment:' || p_row) ->> 'date'`,
    -- and the `text || jsonb` operator tries to cast 'appointment:' to jsonb (22P02).
    perform pg_advisory_xact_lock(
      hashtextextended(concat('appointment:', p_row ->> 'date', ':', p_row ->> 'slot_start'), 0)
    );
    if exists (
      select 1
      from public.sync_mirror m
      where m.entity = 'appointment'
        and m.entity_id <> v_entity_id
        and coalesce(m.row ->> 'deleted_at', '') = ''
        and m.row ->> 'status' = 'booked'
        and m.row ->> 'date' = p_row ->> 'date'
        and (
          (p_row ->> 'slot_start')::bigint
            < (m.row ->> 'slot_start')::bigint
              + coalesce((m.row ->> 'duration_minutes')::bigint, 30) * 60000
          and (m.row ->> 'slot_start')::bigint
            < (p_row ->> 'slot_start')::bigint
              + coalesce((p_row ->> 'duration_minutes')::bigint, 30) * 60000
        )
    ) then
      return jsonb_build_object(
        'ok', false,
        'code', 'slot_taken',
        'message', 'This appointment time was already booked.'
      );
    end if;
  end if;

  insert into public.sync_mirror (entity, entity_id, row, server_seq, updated_at)
  values (p_entity, v_entity_id, p_row, nextval('public.sync_seq'), now())
  on conflict (entity, entity_id)
  do update set
    row = excluded.row,
    server_seq = excluded.server_seq,
    updated_at = excluded.updated_at
  returning server_seq into v_seq;

  return jsonb_build_object('ok', true, 'server_seq', v_seq);
end;
$$;

-- Pulls all changes newer than the caller's last-pulled sequence.
create or replace function public.sync_changes(
  after_seq bigint,
  batch_size integer default 500
)
returns table (entity text, payload jsonb, server_seq bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select m.entity, m.row as payload, m.server_seq
    from public.sync_mirror m
    where m.server_seq > after_seq
    order by m.server_seq asc
    limit batch_size;
end;
$$;

-- Defense in depth: even with direct grants revoked, enable RLS so the mirror
-- is only reachable through the security-definer RPCs (which bypass RLS).
alter table public.sync_mirror enable row level security;

-- Staff devices call sync through the two RPC functions only.
revoke all on public.sync_mirror from anon, authenticated;
grant execute on function public.sync_upsert(text, jsonb) to authenticated;
grant execute on function public.sync_changes(bigint, integer) to authenticated;
