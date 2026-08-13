import { and, asc, eq, isNull, like, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { vehicles, type Vehicle } from '@/data/schema';
import { enqueueChange } from '@/sync/outbox';

export interface NewVehicle {
  plateNumber: string;
  customerId?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
}

export interface VehiclePatch {
  plateNumber?: string;
  customerId?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
}

export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase();
}

export class VehicleRepository {
  constructor(private readonly db: Database) {}

  async findByPlate(plate: string): Promise<Vehicle | undefined> {
    const rows = await this.db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.plateNumber, normalizePlate(plate)), isNull(vehicles.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<Vehicle | undefined> {
    const rows = await this.db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), isNull(vehicles.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async searchByPlate(term: string): Promise<Vehicle[]> {
    const normalized = normalizePlate(term);
    return this.db
      .select()
      .from(vehicles)
      .where(
        and(isNull(vehicles.deletedAt), like(vehicles.plateNumber, `%${normalized}%`)),
      )
      .orderBy(asc(vehicles.plateNumber))
      .limit(20);
  }

  async listByCustomer(customerId: string): Promise<Vehicle[]> {
    return this.db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.customerId, customerId), isNull(vehicles.deletedAt)))
      .orderBy(asc(vehicles.plateNumber));
  }

  async create(input: NewVehicle & { id?: string }): Promise<Vehicle> {
    const base = baseRecord();
    const record: Vehicle = {
      ...base,
      id: input.id ?? base.id,
      plateNumber: normalizePlate(input.plateNumber),
      customerId: input.customerId ?? null,
      make: input.make ?? null,
      model: input.model ?? null,
      color: input.color ?? null,
      year: input.year ?? null,
    };
    await this.db.insert(vehicles).values(record);
    await enqueueChange('vehicle', record.id, 'upsert');
    return record;
  }

  async update(id: string, patch: VehiclePatch): Promise<void> {
    const values: Partial<Vehicle> = { ...patch, updatedAt: Date.now() };
    if (patch.plateNumber !== undefined) {
      values.plateNumber = normalizePlate(patch.plateNumber);
    }
    await this.db
      .update(vehicles)
      .set({ ...values, version: sql`${vehicles.version} + 1` })
      .where(eq(vehicles.id, id));
    await enqueueChange('vehicle', id, 'upsert');
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(vehicles)
      .set({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        version: sql`${vehicles.version} + 1`,
      })
      .where(eq(vehicles.id, id));
    await enqueueChange('vehicle', id, 'delete');
  }
}
