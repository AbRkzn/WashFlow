import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { dayCloses, type DayClose } from '@/data/schema';
import { enqueueChange } from '@/sync/outbox';

export type { DayClose };

export interface NewDayClose {
  day: string;
  closedBy: string;
  closedAt: number;
  jobCount: number;
  revenueCents: number;
  voidedCount: number;
  voidedAmountCents: number;
  expensesCents: number;
  expectedCashCents: number;
  declaredCashCents: number;
  varianceCents: number;
  notes?: string | null;
}

export class DayCloseRepository {
  constructor(private readonly db: Database) {}

  async findByDay(day: string): Promise<DayClose | undefined> {
    const rows = await this.db
      .select()
      .from(dayCloses)
      .where(and(eq(dayCloses.day, day), isNull(dayCloses.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async create(input: NewDayClose): Promise<DayClose> {
    const record: DayClose = { ...baseRecord(), ...input, notes: input.notes ?? null };
    await this.db.insert(dayCloses).values(record);
    await enqueueChange('day_close', record.id, 'upsert');
    return record;
  }

  async softDelete(id: string): Promise<DayClose | undefined> {
    const rows = await this.db
      .update(dayCloses)
      .set({ deletedAt: Date.now(), updatedAt: Date.now(), version: sql`${dayCloses.version} + 1` })
      .where(and(eq(dayCloses.id, id), isNull(dayCloses.deletedAt)))
      .returning();
    const updated = rows[0];
    if (updated) {
      await enqueueChange('day_close', updated.id, 'delete');
    }
    return updated;
  }

  async list(): Promise<DayClose[]> {
    return this.db
      .select()
      .from(dayCloses)
      .where(isNull(dayCloses.deletedAt))
      .orderBy(desc(dayCloses.day));
  }
}
