import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './common';
import { users } from './users';

export const dayCloses = sqliteTable('day_closes', {
  id: text('id').primaryKey(),
  day: text('day').notNull().unique(),
  closedBy: text('closed_by').references(() => users.id),
  closedAt: integer('closed_at').notNull(),
  jobCount: integer('job_count').notNull(),
  revenueCents: integer('revenue_cents').notNull(),
  voidedCount: integer('voided_count').notNull(),
  voidedAmountCents: integer('voided_amount_cents').notNull(),
  expensesCents: integer('expenses_cents').notNull(),
  expectedCashCents: integer('expected_cash_cents').notNull(),
  declaredCashCents: integer('declared_cash_cents').notNull(),
  varianceCents: integer('variance_cents').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const dayCloseDayIndex = index('day_closes_day_idx').on(dayCloses.day);

export type DayClose = typeof dayCloses.$inferSelect;
export type NewDayClose = typeof dayCloses.$inferInsert;
