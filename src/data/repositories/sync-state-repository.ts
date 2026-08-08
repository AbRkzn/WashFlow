import { eq } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { syncState } from '@/data/schema';

export class SyncStateRepository {
  constructor(private readonly db: Database) {}

  async get(key: string): Promise<string | null> {
    const rows = await this.db
      .select()
      .from(syncState)
      .where(eq(syncState.key, key))
      .limit(1);
    return rows[0]?.value ?? null;
  }

  async getNumber(key: string): Promise<number | null> {
    const value = await this.get(key);
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.get(key);
    if (existing === null) {
      await this.db.insert(syncState).values({
        key,
        value,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await this.db
        .update(syncState)
        .set({ value, updatedAt: Date.now() })
        .where(eq(syncState.key, key));
    }
  }
}
