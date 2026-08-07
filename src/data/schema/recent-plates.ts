import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './common';

export const recentPlates = sqliteTable('recent_plates', {
  id: text('id').primaryKey(),
  plate: text('plate').notNull(),
  lastUsedAt: integer('last_used_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const recentPlatePlateIndex = index('recent_plates_plate_idx').on(recentPlates.plate);

export type RecentPlate = typeof recentPlates.$inferSelect;
export type NewRecentPlate = typeof recentPlates.$inferInsert;
