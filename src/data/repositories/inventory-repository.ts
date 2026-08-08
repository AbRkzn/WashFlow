import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { inventoryItems, type InventoryItem } from '@/data/schema';
import type { InventoryCategory } from '@/domain/inventory';

export interface NewInventoryItem {
  name: string;
  category?: InventoryCategory;
  unit?: string;
  quantity?: number;
  lowStockThreshold?: number | null;
  notes?: string | null;
}

export interface InventoryItemPatch {
  name?: string;
  category?: InventoryCategory;
  unit?: string;
  lowStockThreshold?: number | null;
  notes?: string | null;
}

export class InventoryRepository {
  constructor(private readonly db: Database) {}

  async listAll(): Promise<InventoryItem[]> {
    return this.db
      .select()
      .from(inventoryItems)
      .where(isNull(inventoryItems.deletedAt))
      .orderBy(asc(inventoryItems.name));
  }

  async listLowStock(): Promise<InventoryItem[]> {
    const rows = await this.listAll();
    return rows.filter(
      (item) =>
        item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold,
    );
  }

  async findById(id: string): Promise<InventoryItem | undefined> {
    const rows = await this.db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), isNull(inventoryItems.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async create(input: NewInventoryItem): Promise<InventoryItem> {
    const record: InventoryItem = {
      ...baseRecord(),
      name: input.name,
      category: input.category ?? 'supplies',
      unit: input.unit ?? 'pc',
      quantity: input.quantity ?? 0,
      lowStockThreshold: input.lowStockThreshold ?? null,
      notes: input.notes ?? null,
    };
    await this.db.insert(inventoryItems).values(record);
    return record;
  }

  async update(id: string, patch: InventoryItemPatch): Promise<void> {
    await this.db
      .update(inventoryItems)
      .set({ ...patch, updatedAt: Date.now(), version: sql`${inventoryItems.version} + 1` })
      .where(eq(inventoryItems.id, id));
  }

  async applyQuantityChange(id: string, changeQty: number): Promise<void> {
    await this.db
      .update(inventoryItems)
      .set({
        quantity: sql`${inventoryItems.quantity} + ${changeQty}`,
        updatedAt: Date.now(),
        version: sql`${inventoryItems.version} + 1`,
      })
      .where(and(eq(inventoryItems.id, id), isNull(inventoryItems.deletedAt)));
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(inventoryItems)
      .set({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        version: sql`${inventoryItems.version} + 1`,
      })
      .where(eq(inventoryItems.id, id));
  }
}
