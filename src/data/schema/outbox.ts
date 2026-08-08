import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const OUTBOX_OPS = ['upsert', 'delete'] as const;
export type OutboxOp = (typeof OUTBOX_OPS)[number];

export const OUTBOX_STATUSES = ['pending', 'synced', 'failed'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const outbox = sqliteTable('outbox', {
  id: text('id').primaryKey(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  op: text('op').$type<OutboxOp>().notNull().default('upsert'),
  status: text('status').$type<OutboxStatus>().notNull().default('pending'),
  attemptCount: integer('attempt_count').notNull().default(0),
  nextAttemptAt: integer('next_attempt_at').notNull().default(0),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  originDevice: text('origin_device'),
});

export const outboxEntityIndex = index('outbox_entity_idx').on(outbox.entity, outbox.entityId);
export const outboxStatusIndex = index('outbox_status_idx').on(outbox.status, outbox.createdAt);

export type OutboxRow = typeof outbox.$inferSelect;
export type NewOutboxRow = typeof outbox.$inferInsert;
