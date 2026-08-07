import { relations } from 'drizzle-orm';

import { customers } from './customers';
import { jobs } from './jobs';
import { payments } from './payments';
import { photos } from './photos';
import { services } from './services';
import { users } from './users';
import { vehicles } from './vehicles';
import { voidRequests } from './void-requests';

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

export const jobRelations = relations(jobs, ({ one, many }) => ({
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
  photos: many(photos),
  payments: many(payments),
  voidRequests: many(voidRequests),
}));

export const userRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
  payments: many(payments),
  voidRequests: many(voidRequests),
}));

export const photoRelations = relations(photos, ({ one }) => ({
  job: one(jobs, {
    fields: [photos.jobId],
    references: [jobs.id],
  }),
}));

export const paymentRelations = relations(payments, ({ one }) => ({
  job: one(jobs, {
    fields: [payments.jobId],
    references: [jobs.id],
  }),
  receivedByUser: one(users, {
    fields: [payments.receivedBy],
    references: [users.id],
  }),
}));

export const voidRequestRelations = relations(voidRequests, ({ one }) => ({
  job: one(jobs, {
    fields: [voidRequests.jobId],
    references: [jobs.id],
  }),
  requester: one(users, {
    fields: [voidRequests.requestedBy],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [voidRequests.resolvedBy],
    references: [users.id],
  }),
}));

export const serviceRelations = relations(services, ({ many }) => ({
  jobs: many(jobs),
}));
