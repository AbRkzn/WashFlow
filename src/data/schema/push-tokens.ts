import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Per-device push registration. This is device-local state (NOT a sync entity):
 * a token is meaningful only on the device that owns it. The device upserts the
 * token to the remote `push_tokens` mirror so the `send-push` Edge Function can
 * deliver notifications regardless of which counter the washer is signed in on.
 */
export const pushTokens = sqliteTable('push_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull(),
  platform: text('platform').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const pushTokensUserIdIndex = index('push_tokens_user_id_idx').on(pushTokens.userId);

export type PushToken = typeof pushTokens.$inferSelect;
export type NewPushToken = typeof pushTokens.$inferInsert;
