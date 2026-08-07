import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { PaymentMethod } from '@/domain/payment';
import { syncColumns } from './common';
import { jobs } from './jobs';
import { users } from './users';

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  jobId: text('job_id').references(() => jobs.id),
  amountCents: integer('amount_cents').notNull(),
  method: text('method').$type<PaymentMethod>().notNull().default('cash'),
  receivedBy: text('received_by').references(() => users.id),
  paidAt: integer('paid_at').notNull(),
  voidedAt: integer('voided_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const paymentJobIndex = index('payments_job_id_idx').on(payments.jobId);
export const paymentPaidAtIndex = index('payments_paid_at_idx').on(payments.paidAt);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
