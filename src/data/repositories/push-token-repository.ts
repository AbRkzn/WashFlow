import { eq } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { pushTokens } from '@/data/schema';

export interface PushTokenEntry {
  id: string;
  userId: string;
  token: string;
  platform: string;
  createdAt: number;
  updatedAt: number;
}

export type NewPushToken = Omit<PushTokenEntry, 'createdAt' | 'updatedAt'>;

/**
 * Local-only per-device push registrations. Not a sync entity: tokens are
 * device-specific and are mirrored to Supabase so the `send-push` Edge
 * Function can reach the right device.
 */
export class PushTokenRepository {
  constructor(private readonly db: Database) {}

  async upsert(userId: string, token: string, platform: string): Promise<void> {
    const now = Date.now();
    const existing = await this.findByUserId(userId);
    if (existing) {
      await this.db
        .update(pushTokens)
        .set({ token, platform, updatedAt: now })
        .where(eq(pushTokens.userId, userId));
      return;
    }
    await this.db.insert(pushTokens).values({
      id: crypto.randomUUID(),
      userId,
      token,
      platform,
      createdAt: now,
      updatedAt: now,
    });
  }

  async findByUserId(userId: string): Promise<PushTokenEntry | null> {
    const rows = await this.db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.delete(pushTokens).where(eq(pushTokens.userId, userId));
  }
}
