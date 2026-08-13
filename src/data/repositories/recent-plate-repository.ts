import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { customers, recentPlates, vehicles, type RecentPlate } from '@/data/schema';
import { enqueueChange } from '@/sync/outbox';
import { normalizePlate } from './vehicle-repository';

export interface RecentPlateWithCustomer {
  id: string;
  plate: string;
  customerName: string | null;
}

export class RecentPlateRepository {
  constructor(private readonly db: Database) {}

  async record(plate: string): Promise<void> {
    const normalized = normalizePlate(plate);
    const existing = await this.db
      .select()
      .from(recentPlates)
      .where(eq(recentPlates.plate, normalized))
      .limit(1);
    if (existing[0]) {
      await this.db
        .update(recentPlates)
        .set({ lastUsedAt: Date.now(), updatedAt: Date.now(), version: sql`${recentPlates.version} + 1` })
        .where(eq(recentPlates.id, existing[0].id));
      await enqueueChange('recent_plate', existing[0].id, 'upsert');
      return;
    }
    const record: RecentPlate = {
      ...baseRecord(),
      plate: normalized,
      lastUsedAt: Date.now(),
    };
    await this.db.insert(recentPlates).values(record);
    await enqueueChange('recent_plate', record.id, 'upsert');
  }

  async listRecent(limit = 5): Promise<RecentPlate[]> {
    return this.db
      .select()
      .from(recentPlates)
      .orderBy(desc(recentPlates.lastUsedAt))
      .limit(limit);
  }

  /** Recent plates joined with their owning customer's name, deduped by customer. */
  async listRecentWithCustomers(limit = 5): Promise<RecentPlateWithCustomer[]> {
    const rows = await this.db
      .select({
        id: recentPlates.id,
        plate: recentPlates.plate,
        customerName: customers.name,
      })
      .from(recentPlates)
      .leftJoin(vehicles, eq(recentPlates.plate, vehicles.plateNumber))
      .leftJoin(customers, eq(vehicles.customerId, customers.id))
      .where(
        and(
          isNull(recentPlates.deletedAt),
          or(isNull(vehicles.deletedAt), isNull(vehicles.id)),
          or(isNull(customers.deletedAt), isNull(customers.id)),
        ),
      )
      .groupBy(recentPlates.id)
      .orderBy(desc(recentPlates.lastUsedAt));

    const seen = new Set<string>();
    const deduped: RecentPlateWithCustomer[] = [];
    for (const row of rows) {
      const label = row.customerName ?? row.plate;
      if (seen.has(label)) continue;
      seen.add(label);
      deduped.push(row);
      if (deduped.length >= limit) break;
    }
    return deduped;
  }
}
