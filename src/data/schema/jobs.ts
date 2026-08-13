import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { JobStatus } from '@/domain/job';
import { syncColumns } from './common';
import { customers } from './customers';
import { services } from './services';
import { vehicles } from './vehicles';

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  vehicleId: text('vehicle_id').references(() => vehicles.id),
  serviceId: text('service_id').references(() => services.id),
  status: text('status').$type<JobStatus>().notNull().default('queued'),
  priceCents: integer('price_cents').notNull(),
  assignedTo: text('assigned_to'),
  notes: text('notes'),
  queueOrder: integer('queue_order'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const jobStatusIndex = index('jobs_status_idx').on(jobs.status);
export const jobCreatedIndex = index('jobs_created_at_idx').on(jobs.createdAt);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
