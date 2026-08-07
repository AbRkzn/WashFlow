import { desc, eq, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { recentPlates, type RecentPlate } from '@/data/schema';
import { normalizePlate } from './vehicle-repository';

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
      return;
    }
    const record: RecentPlate = {
      ...baseRecord(),
      plate: normalized,
      lastUsedAt: Date.now(),
    };
    await this.db.insert(recentPlates).values(record);
  }

  async listRecent(limit = 5): Promise<RecentPlate[]> {
    return this.db
      .select()
      .from(recentPlates)
      .orderBy(desc(recentPlates.lastUsedAt))
      .limit(limit);
  }
}
