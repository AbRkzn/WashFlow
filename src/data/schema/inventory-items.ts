import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { InventoryCategory } from '@/domain/inventory';
import { syncColumns } from './common';

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').$type<InventoryCategory>().notNull().default('supplies'),
  unit: text('unit').notNull().default('pc'),
  quantity: integer('quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
