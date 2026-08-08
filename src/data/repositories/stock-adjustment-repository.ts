import { asc, eq, isNull } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { stockAdjustments, type StockAdjustment } from '@/data/schema';
import type { AdjustmentType } from '@/domain/inventory';
import { enqueueChange } from '@/sync/outbox';

export interface NewStockAdjustment {
  itemId: string;
  changeQty: number;
  type?: AdjustmentType;
  reason?: string | null;
  adjustedBy?: string | null;
}

export class StockAdjustmentRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewStockAdjustment): Promise<StockAdjustment> {
    const record: StockAdjustment = {
      ...baseRecord(),
      itemId: input.itemId,
      changeQty: input.changeQty,
      type: input.type ?? 'correction',
      reason: input.reason ?? null,
      adjustedBy: input.adjustedBy ?? null,
    };
    await this.db.insert(stockAdjustments).values(record);
    await enqueueChange('stock_adjustment', record.id, 'upsert');
    return record;
  }

  async listForItem(itemId: string): Promise<StockAdjustment[]> {
    return this.db
      .select()
      .from(stockAdjustments)
      .where(eq(stockAdjustments.itemId, itemId))
      .orderBy(asc(stockAdjustments.createdAt));
  }

  async listRecent(limit = 50): Promise<StockAdjustment[]> {
    return this.db
      .select()
      .from(stockAdjustments)
      .where(isNull(stockAdjustments.deletedAt))
      .orderBy(stockAdjustments.createdAt)
      .limit(limit);
  }
}
