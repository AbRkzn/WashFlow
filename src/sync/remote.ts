import { supabase } from '@/api/supabase';

export interface RemoteChange {
  entity: string;
  row: Record<string, unknown>;
  serverSeq: number;
}

export type RemotePushResult =
  | { ok: true; serverSeq: number }
  | { ok: false; code: string; message?: string };

/**
 * Remote adapter. Pushes full row state (snake_case keys) to the server via a
 * `sync_upsert` RPC and pulls changes after a sequence via `sync_changes`.
 * These functions live in supabase/sync.sql (deployable). When the function
 * is missing or the device is offline, calls throw — the engine treats that
 * as "offline" and the local outbox keeps growing.
 *
 * The server may answer a push with a hard conflict (e.g. `job_claimed`,
 * `slot_taken`). That is NOT a network failure — it is a final server
 * decision — so the engine settles the entry instead of retrying it.
 *
 * NOTE: PostgREST matches RPC arguments by exact parameter name, so we send
 * the `p_entity`/`p_row` names declared in sync.sql (a param cannot be named
 * `row` — it is reserved).
 */
export async function remotePush(
  entity: string,
  row: Record<string, unknown>,
): Promise<RemotePushResult> {
  const { data, error } = await supabase.rpc('sync_upsert', {
    p_entity: entity,
    p_row: row,
  });
  if (error) {
    throw error;
  }
  const result = data as { ok?: boolean; server_seq?: number; code?: string; message?: string } | null;
  if (result && result.ok === false) {
    return { ok: false, code: String(result.code ?? 'conflict'), message: result.message };
  }
  return { ok: true, serverSeq: Number(result?.server_seq ?? result) };
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
    row: (change.payload ?? {}) as Record<string, unknown>,
    serverSeq: Number(change.server_seq),
  }));
}
