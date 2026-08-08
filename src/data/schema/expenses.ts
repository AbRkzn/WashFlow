import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { ExpenseCategory } from '@/domain/expense';
import { syncColumns } from './common';
import { users } from './users';

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  amountCents: integer('amount_cents').notNull(),
  category: text('category').$type<ExpenseCategory>().notNull().default('other'),
  description: text('description'),
  incurredAt: integer('incurred_at').notNull(),
  loggedBy: text('logged_by').references(() => users.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const expenseIncurredAtIndex = index('expenses_incurred_at_idx').on(expenses.incurredAt);
export const expenseCategoryIndex = index('expenses_category_idx').on(expenses.category);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
