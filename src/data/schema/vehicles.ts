import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './common';
import { customers } from './customers';

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  plateNumber: text('plate_number').notNull(),
  make: text('make'),
  model: text('model'),
  color: text('color'),
  year: integer('year'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const vehiclePlateIndex = index('vehicles_plate_number_idx').on(vehicles.plateNumber);
export const vehicleCustomerIndex = index('vehicles_customer_id_idx').on(vehicles.customerId);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
