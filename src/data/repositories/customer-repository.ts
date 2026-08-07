import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { customers, type Customer } from '@/data/schema';

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

export class CustomerRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<Customer[]> {
    return this.db
      .select()
      .from(customers)
      .where(isNull(customers.deletedAt))
      .orderBy(asc(customers.name));
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

  async create(input: NewCustomer): Promise<Customer> {
    const record: Customer = { ...baseRecord(), name: input.name, phone: input.phone ?? null, notes: input.notes ?? null };
    await this.db.insert(customers).values(record);
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
  }
}
