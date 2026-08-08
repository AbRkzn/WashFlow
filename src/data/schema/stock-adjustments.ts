import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { AdjustmentType } from '@/domain/inventory';
import { syncColumns } from './common';
import { inventoryItems } from './inventory-items';
import { users } from './users';

export const stockAdjustments = sqliteTable('stock_adjustments', {
  id: text('id').primaryKey(),
  itemId: text('item_id')
    .notNull()
    .references(() => inventoryItems.id),
  changeQty: integer('change_qty').notNull(),
  type: text('type').$type<AdjustmentType>().notNull().default('correction'),
  reason: text('reason'),
  adjustedBy: text('adjusted_by').references(() => users.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const stockAdjustmentItemIndex = index('stock_adjustments_item_id_idx').on(
  stockAdjustments.itemId,
);

export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustments.$inferInsert;
