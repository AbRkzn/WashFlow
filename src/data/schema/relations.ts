import { relations } from 'drizzle-orm';

import { customers } from './customers';
import { vehicles } from './vehicles';

export const customerRelations = relations(customers, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehicleRelations = relations(vehicles, ({ one }) => ({
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
}));
