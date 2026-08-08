import { and, asc, count, eq, lte, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { outbox, type OutboxOp, type OutboxRow, type OutboxStatus } from '@/data/schema';

export interface NewOutboxEntry {
  entity: string;
  entityId: string;
  op?: OutboxOp;
}

export class OutboxRepository {
  constructor(private readonly db: Database) {}

  async enqueue(input: NewOutboxEntry): Promise<void> {
    const record: OutboxRow = {
      ...baseRecord(),
      entity: input.entity,
      entityId: input.entityId,
      op: input.op ?? 'upsert',
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
      lastError: null,
    };
    await this.db.insert(outbox).values(record);
  }

  async listPending(): Promise<OutboxRow[]> {
    return this.db
      .select()
      .from(outbox)
      .where(eq(outbox.status, 'pending'))
      .orderBy(asc(outbox.createdAt));
  }

  async listDue(): Promise<OutboxRow[]> {
    return this.db
      .select()
      .from(outbox)
      .where(and(eq(outbox.status, 'pending'), lte(outbox.nextAttemptAt, Date.now())))
      .orderBy(asc(outbox.createdAt));
  }

  async listForEntity(entity: string, entityId: string): Promise<OutboxRow[]> {
    return this.db
      .select()
      .from(outbox)
      .where(and(eq(outbox.entity, entity), eq(outbox.entityId, entityId)))
      .orderBy(asc(outbox.createdAt));
  }

  async countPending(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(outbox)
      .where(eq(outbox.status, 'pending'));
    return rows[0]?.value ?? 0;
  }

  async markSynced(id: string): Promise<void> {
    await this.db
      .update(outbox)
      .set({ status: 'synced', updatedAt: Date.now() })
      .where(eq(outbox.id, id));
  }

  async markFailed(id: string, error: string, nextAttemptAt: number): Promise<void> {
    await this.db
      .update(outbox)
      .set({
        status: 'failed',
        lastError: error,
        attemptCount: sql`${outbox.attemptCount} + 1`,
        nextAttemptAt,
        updatedAt: Date.now(),
      })
      .where(eq(outbox.id, id));
  }

  async retryDue(): Promise<void> {
    await this.db
      .update(outbox)
      .set({ status: 'pending', updatedAt: Date.now() })
      .where(and(eq(outbox.status, 'failed'), lte(outbox.nextAttemptAt, Date.now())));
  }
}

export type { OutboxStatus };
