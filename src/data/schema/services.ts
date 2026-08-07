import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './common';

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
