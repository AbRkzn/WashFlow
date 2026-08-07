import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { UserRole } from '@/domain/user';
import { syncColumns } from './common';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').$type<UserRole>().notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
