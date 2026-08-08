-- WashFlow sync mirror (Supabase/Postgres).
-- P8a: server-assigned sequence + full-row mirror + pull-by-sequence.
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
--   * `sync_upsert` runs `security definer` and is atomic: it takes the next
--     sequence value and upserts in a single statement. Slot/claim
--     first-write-wins checks land here in P8b.
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
    'appointment', 'expense', 'inventory_item', 'stock_adjustment',
    'photo', 'recent_plate', 'setting', 'user'
  );
$$;

-- Pushes one full row and returns the server-assigned sequence number.
create or replace function public.sync_upsert(p_entity text, p_row jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text;
  v_seq bigint;
begin
  if not public.sync_accepts_entity(p_entity) then
    raise exception 'unknown sync entity: %', p_entity;
  end if;

  v_entity_id := coalesce(p_row ->> 'id', p_row ->> 'key', '');
  if v_entity_id = '' then
    raise exception 'sync row missing id/key';
  end if;

  insert into public.sync_mirror (entity, entity_id, row, server_seq, updated_at)
  values (p_entity, v_entity_id, p_row, nextval('public.sync_seq'), now())
  on conflict (entity, entity_id)
  do update set
    row = excluded.row,
    server_seq = excluded.server_seq,
    updated_at = excluded.updated_at
  returning server_seq into v_seq;

  return v_seq;
end;
$$;

-- Pulls all changes newer than the caller's last-pulled sequence.
create or replace function public.sync_changes(
  after_seq bigint,
  batch_size integer default 500
)
returns table (entity text, row jsonb, server_seq bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select m.entity, m.row, m.server_seq
    from public.sync_mirror m
    where m.server_seq > after_seq
    order by m.server_seq asc
    limit batch_size;
end;
$$;

-- Staff devices call sync through the two RPC functions only.
revoke all on public.sync_mirror from anon, authenticated;
grant execute on function public.sync_upsert(text, jsonb) to authenticated;
grant execute on function public.sync_changes(bigint, integer) to authenticated;
