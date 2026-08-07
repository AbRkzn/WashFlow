import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { AppointmentStatus } from '@/domain/appointment';
import { syncColumns } from './common';
import { customers } from './customers';
import { jobs } from './jobs';
import { services } from './services';
import { vehicles } from './vehicles';

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').references(() => vehicles.id),
  customerId: text('customer_id').references(() => customers.id),
  serviceId: text('service_id').references(() => services.id),
  jobId: text('job_id').references(() => jobs.id),
  date: text('date').notNull(),
  slotStart: integer('slot_start').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  status: text('status').$type<AppointmentStatus>().notNull().default('booked'),
  rescheduled: integer('rescheduled', { mode: 'boolean' }).notNull().default(false),
  rescheduledFrom: integer('rescheduled_from'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const appointmentDateIndex = index('appointments_date_idx').on(appointments.date, appointments.slotStart);
export const appointmentStatusIndex = index('appointments_status_idx').on(appointments.status);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
