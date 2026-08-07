import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { VoidRequestStatus } from '@/domain/payment';
import { syncColumns } from './common';
import { jobs } from './jobs';
import { users } from './users';

export const voidRequests = sqliteTable('void_requests', {
  id: text('id').primaryKey(),
  jobId: text('job_id').references(() => jobs.id),
  requestedBy: text('requested_by').references(() => users.id),
  reason: text('reason'),
  status: text('status').$type<VoidRequestStatus>().notNull().default('pending'),
  resolvedBy: text('resolved_by').references(() => users.id),
  resolvedAt: integer('resolved_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const voidRequestJobIndex = index('void_requests_job_id_idx').on(voidRequests.jobId);
export const voidRequestStatusIndex = index('void_requests_status_idx').on(voidRequests.status);

export type VoidRequest = typeof voidRequests.$inferSelect;
export type NewVoidRequest = typeof voidRequests.$inferInsert;
