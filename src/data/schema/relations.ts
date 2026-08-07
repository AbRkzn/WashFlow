import { relations } from 'drizzle-orm';

import { customers } from './customers';
import { jobs } from './jobs';
import { services } from './services';
import { users } from './users';
import { vehicles } from './vehicles';

export const customerRelations = relations(customers, ({ many }) => ({
  vehicles: many(vehicles),
  jobs: many(jobs),
}));

export const vehicleRelations = relations(vehicles, ({ one, many }) => ({
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
  jobs: many(jobs),
}));

export const jobRelations = relations(jobs, ({ one }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [jobs.vehicleId],
    references: [vehicles.id],
  }),
  service: one(services, {
    fields: [jobs.serviceId],
    references: [services.id],
  }),
  assignedUser: one(users, {
    fields: [jobs.assignedTo],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
}));

export const serviceRelations = relations(services, ({ many }) => ({
  jobs: many(jobs),
}));
