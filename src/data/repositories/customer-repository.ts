import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { customers, jobs, payments, vehicles, type Customer, type Vehicle } from '@/data/schema';
import { enqueueChange } from '@/sync/outbox';

export interface NewCustomer {
  name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface CustomerPatch {
  name?: string;
  phone?: string | null;
  notes?: string | null;
}

export interface CustomerDirectoryEntry {
  customer: Customer;
  vehicles: Vehicle[];
  visitCount: number;
  totalSpentCents: number;
  lastVisitAt: number | null;
}

export class CustomerRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<Customer[]> {
    return this.db
      .select()
      .from(customers)
      .where(isNull(customers.deletedAt))
      .orderBy(asc(customers.name));
  }

  /** Customer registry with vehicles, visit counts, and non-voided spend. */
  async listDirectory(): Promise<CustomerDirectoryEntry[]> {
    const customerList = await this.db
      .select()
      .from(customers)
      .where(isNull(customers.deletedAt))
      .orderBy(asc(customers.name));
    if (customerList.length === 0) {
      return [];
    }

    const vehicleList = await this.db
      .select()
      .from(vehicles)
      .where(isNull(vehicles.deletedAt))
      .orderBy(asc(vehicles.plateNumber));
    const vehiclesByCustomer = new Map<string, Vehicle[]>();
    for (const vehicle of vehicleList) {
      if (!vehicle.customerId) continue;
      const owned = vehiclesByCustomer.get(vehicle.customerId) ?? [];
      owned.push(vehicle);
      vehiclesByCustomer.set(vehicle.customerId, owned);
    }

    const jobRows = await this.db
      .select({ id: jobs.id, customerId: jobs.customerId, createdAt: jobs.createdAt })
      .from(jobs)
      .where(isNull(jobs.deletedAt));
    const customerOfJob = new Map<string, string>();
    const visitCount = new Map<string, number>();
    const lastVisitAt = new Map<string, number>();
    for (const job of jobRows) {
      if (!job.customerId) continue;
      customerOfJob.set(job.id, job.customerId);
      visitCount.set(job.customerId, (visitCount.get(job.customerId) ?? 0) + 1);
      const previous = lastVisitAt.get(job.customerId) ?? 0;
      if (job.createdAt > previous) {
        lastVisitAt.set(job.customerId, job.createdAt);
      }
    }

    const paymentRows = await this.db
      .select({ jobId: payments.jobId, amountCents: payments.amountCents })
      .from(payments)
      .where(isNull(payments.voidedAt));
    const totalSpent = new Map<string, number>();
    for (const payment of paymentRows) {
      if (!payment.jobId) continue;
      const customerId = customerOfJob.get(payment.jobId);
      if (!customerId) continue;
      totalSpent.set(customerId, (totalSpent.get(customerId) ?? 0) + payment.amountCents);
    }

    return customerList.map((customer) => ({
      customer,
      vehicles: vehiclesByCustomer.get(customer.id) ?? [],
      visitCount: visitCount.get(customer.id) ?? 0,
      totalSpentCents: totalSpent.get(customer.id) ?? 0,
      lastVisitAt: lastVisitAt.get(customer.id) ?? null,
    }));
  }

  async findById(id: string): Promise<Customer | undefined> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), isNull(customers.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findByPhone(phone: string): Promise<Customer | undefined> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.phone, phone), isNull(customers.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async create(input: NewCustomer & { id?: string }): Promise<Customer> {
    const base = baseRecord();
    const record: Customer = {
      ...base,
      id: input.id ?? base.id,
      name: input.name,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    };
    await this.db.insert(customers).values(record);
    await enqueueChange('customer', record.id, 'upsert');
    return record;
  }

  async update(id: string, patch: CustomerPatch): Promise<void> {
    await this.db
      .update(customers)
      .set({
        ...patch,
        updatedAt: Date.now(),
        version: sql`${customers.version} + 1`,
      })
      .where(eq(customers.id, id));
    await enqueueChange('customer', id, 'upsert');
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(customers)
      .set({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        version: sql`${customers.version} + 1`,
      })
      .where(eq(customers.id, id));
    await enqueueChange('customer', id, 'delete');
  }
}
