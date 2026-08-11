import { db } from '@/data/db';
import { ConflictReviewRepository, type ConflictReviewEntry } from '@/data/repositories';
import type { ConflictResolution } from '@/domain/conflict';
import { logAudit } from '@/services/audit';
import { applyRemote, clearOutboxFor } from '@/sync/engine';

const conflictRepository = new ConflictReviewRepository(db);

export async function listPendingConflicts(): Promise<ConflictReviewEntry[]> {
  return conflictRepository.listPendingWithDetails();
}

export function parseConflictRow(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface ResolveConflictResult {
  resolution: ConflictResolution;
  appliedRemote: boolean;
}

/**
 * Resolves a sync conflict:
 * - `approved`: the remote version wins. Applied locally immediately, and the
 *   queued local change is dropped so the server state stands.
 * - `rejected`: the local version wins. The queued local change is left in the
 *   outbox and will overwrite the server on the next successful sync.
 * - `dismissed`: acknowledged without changing data.
 */
export async function resolveConflict(
  id: string,
  resolution: ConflictResolution,
  actorId: string,
): Promise<ResolveConflictResult> {
  const conflict = await conflictRepository.findById(id);
  if (!conflict) {
    throw new Error('Conflict not found.');
  }
  if (conflict.status !== 'pending') {
    throw new Error('This conflict has already been resolved.');
  }

  let appliedRemote = false;
  if (resolution === 'approved') {
    const remoteRow = parseConflictRow(conflict.remoteRow);
    if (remoteRow) {
      await applyRemote(conflict.entity, remoteRow);
      appliedRemote = true;
    }
    // Drop the local change so the server (remote) version stands.
    await clearOutboxFor(conflict.entity, conflict.entityId);
  }

  const resolved = await conflictRepository.markResolved(id, resolution, actorId);
  if (!resolved) {
    throw new Error('This conflict has already been resolved.');
  }

  await logAudit({
    actorId,
    action: 'conflict-resolved',
    entity: 'conflict_review',
    entityId: id,
    details: { resolution, entity: conflict.entity, entityId: conflict.entityId },
  });

  return { resolution, appliedRemote };
}
