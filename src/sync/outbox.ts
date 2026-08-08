import { db } from '@/data/db';
import { OutboxRepository } from '@/data/repositories/outbox-repository';
import type { OutboxOp } from '@/data/schema';

const outboxRepository = new OutboxRepository(db);

/**
 * Records an intent to sync a row change. Called after every local mutation.
 * Best-effort: a failure here only means the change is not queued yet; the
 * engine's reconcile pass can rebuild the queue in a later phase.
 */
export async function enqueueChange(
  entity: string,
  entityId: string,
  op: OutboxOp = 'upsert',
): Promise<void> {
  try {
    await outboxRepository.enqueue({ entity, entityId, op });
  } catch (error) {
    console.warn(`Outbox enqueue failed (non-fatal) for ${entity}:${entityId}`, error);
  }
}
