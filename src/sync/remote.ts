import { supabase } from '@/api/supabase';

export interface RemoteChange {
  entity: string;
  row: Record<string, unknown>;
  serverSeq: number;
}

/**
 * Remote adapter. Pushes full row state (snake_case keys) to the server via a
 * `sync_upsert` RPC and pulls changes after a sequence via `sync_changes`.
 * These functions live in supabase/sync.sql (deployable). When the function
 * is missing or the device is offline, calls throw — the engine treats that
 * as "offline" and the local outbox keeps growing.
 */
export async function remotePush(
  entity: string,
  row: Record<string, unknown>,
): Promise<{ serverSeq: number }> {
  const { data, error } = await supabase.rpc('sync_upsert', {
    entity,
    row,
  });
  if (error) {
    throw error;
  }
  return { serverSeq: Number(data) };
}

export async function remotePull(afterSeq: number): Promise<RemoteChange[]> {
  const { data, error } = await supabase.rpc('sync_changes', {
    after_seq: afterSeq,
  });
  if (error) {
    throw error;
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((change) => ({
    entity: String(change.entity),
    row: (change.row ?? {}) as Record<string, unknown>,
    serverSeq: Number(change.server_seq),
  }));
}
