import { eq } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { settings, type Setting } from '@/data/schema';
import { enqueueChange } from '@/sync/outbox';

export class SettingsRepository {
  constructor(private readonly db: Database) {}

  async get(key: string): Promise<string | null> {
    const rows = await this.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.get(key);
    if (existing === null) {
      const record: Setting = {
        ...baseRecord(),
        key,
        value,
      };
      await this.db.insert(settings).values(record);
    } else {
      await this.db
        .update(settings)
        .set({ value, updatedAt: Date.now() })
        .where(eq(settings.key, key));
    }
    await enqueueChange('setting', key, 'upsert');
  }
}
