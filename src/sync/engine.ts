import { eq } from 'drizzle-orm';

import { db } from '@/data/db';
import { OutboxRepository, SyncStateRepository } from '@/data/repositories';
import { ConflictReviewRepository } from '@/data/repositories/conflict-repository';
import { SYNC_STATE_KEYS } from '@/data/schema';
import { conflictKindForEntity, describeConflict, type ConflictKind } from '@/domain/conflict';
import { reflowAppointmentOnConflict } from '@/services/appointments';
import { dbColumnName, entityByName, rowFromRemote, rowToRemote, type SyncEntity } from '@/sync/entities';
import { remotePull, remotePush } from '@/sync/remote';
import { backoffMs, coalescePending } from '@/sync/sync-logic';

const outboxRepository = new OutboxRepository(db);
const syncStateRepository = new SyncStateRepository(db);
const conflictRepository = new ConflictReviewRepository(db);

let running = false;
let lastError: string | null = null;

export interface SyncResult {
  pushed: number;
  pulled: number;
  offline: boolean;
  skipped: boolean;
}

export interface SyncSummary {
  pending: number;
  lastSyncedAt: number;
  lastPulledSeq: number;
  lastError: string | null;
  running: boolean;
}

function idColumn(entity: SyncEntity): string {
  return dbColumnName(entity.table, entity.idKey);
}

async function readRow(entity: SyncEntity, entityId: string): Promise<Record<string, unknown> | undefined> {
  const rows = await db
    .select()
    .from(entity.table)
    .where(eq((entity.table as never as Record<string, unknown>)[entity.idKey] as never, entityId as never))
    .limit(1);
  return (rows[0] as Record<string, unknown> | undefined) ?? undefined;
}

async function updateSeq(entity: SyncEntity, entityId: string, serverSeq: number): Promise<void> {
  await db
    .update(entity.table)
    .set({ serverSeq })
    .where(eq((entity.table as never as Record<string, unknown>)[entity.idKey] as never, entityId as never));
}

async function upsertRow(entity: SyncEntity, row: Record<string, unknown>): Promise<void> {
  await db
    .insert(entity.table)
    .values(row as never)
    .onConflictDoUpdate({
      target: (entity.table as never as Record<string, unknown>)[entity.idKey] as never,
      set: row as never,
    });
}

async function isDirty(entity: SyncEntity, entityId: string): Promise<boolean> {
  const entries = await outboxRepository.listForEntity(entity.name, entityId);
  return entries.some((entry) => entry.status !== 'synced');
}

/**
 * Records a conflict for the Manager review queue. Deduplicated on the
 * pending status so repeated sync cycles don't spam the queue. Best-effort.
 */
async function createConflictRecord(
  kind: ConflictKind,
  entity: string,
  entityId: string,
  options: { description?: string; localRow?: Record<string, unknown>; remoteRow?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    if (await conflictRepository.hasPendingFor(entity, entityId)) {
      return;
    }
    await conflictRepository.create({
      kind,
      entity,
      entityId,
      description: options.description ?? describeConflict(kind),
      localRow: options.localRow ?? null,
      remoteRow: options.remoteRow ?? null,
    });
  } catch (error) {
    console.warn('Conflict review enqueue failed (non-fatal)', error);
  }
}

export async function pushPending(): Promise<SyncResult> {
  await outboxRepository.retryDue();
  const pending = await outboxRepository.listPending();
  if (pending.length === 0) {
    return { pushed: 0, pulled: 0, offline: false, skipped: false };
  }

  const ordered = coalescePending(pending);
  let pushed = 0;
  let failed = 0;

  for (const entry of ordered) {
    const entity = entityByName(entry.entity);
    if (!entity) {
      await outboxRepository.markSynced(entry.id);
      continue;
    }
    const row = await readRow(entity, entry.entityId);
    if (!row) {
      await outboxRepository.markSynced(entry.id);
      continue;
    }
    const payload = rowToRemote(entity.table, row);
    try {
      const result = await remotePush(entry.entity, payload);
      if (result.ok) {
        await updateSeq(entity, entry.entityId, result.serverSeq);
        await outboxRepository.markSynced(entry.id);
        pushed += 1;
      } else {
        // Hard server decision (first-write-wins / first-claim-wins): settle
        // the entry instead of retrying, then record it for the Manager.
        await outboxRepository.markSynced(entry.id);
        if (result.code === 'slot_taken' && entry.entity === 'appointment') {
          await reflowAppointmentOnConflict(entry.entityId);
        }
        await createConflictRecord(
          result.code === 'job_claimed' ? 'claim' : 'slot',
          entry.entity,
          entry.entityId,
          { localRow: payload },
        );
        pushed += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;
      await outboxRepository.markFailed(entry.id, message, Date.now() + backoffMs(entry.attemptCount));
      failed += 1;
      break;
    }
  }

  return { pushed, pulled: 0, offline: failed > 0, skipped: false };
}

export async function pullChanges(): Promise<SyncResult> {
  const afterSeq = (await syncStateRepository.getNumber(SYNC_STATE_KEYS.lastPulledSeq)) ?? 0;
  let changes;
  try {
    changes = await remotePull(afterSeq);
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    return { pushed: 0, pulled: 0, offline: true, skipped: false };
  }

  let pulled = 0;
  let maxSeq = afterSeq;
  for (const change of changes) {
    const entity = entityByName(change.entity);
    if (!entity) continue;
    const remote = change.row as Record<string, unknown>;
    const entityId = String(remote[idColumn(entity)] ?? '');
    if (!entityId) continue;
    if (await isDirty(entity, entityId)) {
      // Both sides changed this row. Routine entities follow Last-Write-Wins
      // (the local change is queued to push and will win by sequence). Financial
      // rows are never silently resolved — route them to the Manager queue.
      const kind = conflictKindForEntity(entity.name);
      if (kind) {
        const localRow = await readRow(entity, entityId);
        await createConflictRecord(kind, entity.name, entityId, {
          localRow: localRow ? rowToRemote(entity.table, localRow) : undefined,
          remoteRow: remote,
        });
      }
      continue;
    }
    const localRow = rowFromRemote(entity.table, remote);
    await upsertRow(entity, localRow);
    maxSeq = Math.max(maxSeq, change.serverSeq);
    pulled += 1;
  }

  if (pulled > 0 || changes.length > 0) {
    await syncStateRepository.set(SYNC_STATE_KEYS.lastPulledSeq, String(maxSeq));
  }
  await syncStateRepository.set(SYNC_STATE_KEYS.lastSyncedAt, String(Date.now()));
  lastError = null;
  return { pushed: 0, pulled, offline: false, skipped: false };
}

export async function runSync(): Promise<SyncResult> {
  if (running) {
    return { pushed: 0, pulled: 0, offline: false, skipped: true };
  }
  running = true;
  try {
    const push = await pushPending();
    if (push.offline) {
      return { ...push, skipped: false };
    }
    const pull = await pullChanges();
    return {
      pushed: push.pushed,
      pulled: pull.pulled,
      offline: pull.offline,
      skipped: false,
    };
  } finally {
    running = false;
  }
}

export async function getSyncSummary(): Promise<SyncSummary> {
  const lastSyncedAt = (await syncStateRepository.getNumber(SYNC_STATE_KEYS.lastSyncedAt)) ?? 0;
  const lastPulledSeq = (await syncStateRepository.getNumber(SYNC_STATE_KEYS.lastPulledSeq)) ?? 0;
  return {
    pending: await outboxRepository.countPending(),
    lastSyncedAt,
    lastPulledSeq,
    lastError,
    running,
  };
}

/**
 * Applies a remote row (snake_case) to the local entity table, overwriting the
 * local version. Used when a Manager approves the remote side of a conflict.
 */
export async function applyRemote(entityName: string, row: Record<string, unknown>): Promise<void> {
  const entity = entityByName(entityName);
  if (!entity) {
    return;
  }
  const localRow = rowFromRemote(entity.table, row);
  await upsertRow(entity, localRow);
}

/** Clears every queued local change for a row — used when the remote side wins. */
export async function clearOutboxFor(entityName: string, entityId: string): Promise<void> {
  const entries = await outboxRepository.listForEntity(entityName, entityId);
  for (const entry of entries) {
    if (entry.status !== 'synced') {
      await outboxRepository.markSynced(entry.id);
    }
  }
}
