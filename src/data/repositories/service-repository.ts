import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { services, type Service } from '@/data/schema';

export interface NewService {
  name: string;
  description?: string | null;
  priceCents: number;
  durationMinutes?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ServicePatch {
  name?: string;
  description?: string | null;
  priceCents?: number;
  durationMinutes?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export class ServiceRepository {
  constructor(private readonly db: Database) {}

  async listActive(): Promise<Service[]> {
    return this.db
      .select()
      .from(services)
      .where(and(isNull(services.deletedAt), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name));
  }

  async listAll(): Promise<Service[]> {
    return this.db
      .select()
      .from(services)
      .where(isNull(services.deletedAt))
      .orderBy(asc(services.sortOrder), asc(services.name));
  }

  async findById(id: string): Promise<Service | undefined> {
    const rows = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async create(input: NewService): Promise<Service> {
    const record: Service = {
      ...baseRecord(),
      name: input.name,
      description: input.description ?? null,
      priceCents: input.priceCents,
      durationMinutes: input.durationMinutes ?? 30,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    };
    await this.db.insert(services).values(record);
    return record;
  }

  async update(id: string, patch: ServicePatch): Promise<void> {
    await this.db
      .update(services)
      .set({ ...patch, updatedAt: Date.now(), version: sql`${services.version} + 1` })
      .where(eq(services.id, id));
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(services)
      .set({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        version: sql`${services.version} + 1`,
      })
      .where(eq(services.id, id));
  }
}
