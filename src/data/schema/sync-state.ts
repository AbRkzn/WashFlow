import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const SYNC_STATE_KEYS = {
  lastPulledSeq: 'last_pulled_seq',
  lastSyncedAt: 'last_synced_at',
} as const;

export type SyncState = typeof syncState.$inferSelect;
export type NewSyncState = typeof syncState.$inferInsert;
