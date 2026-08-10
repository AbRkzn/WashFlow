import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './common';
import { inventoryItems } from './inventory-items';
import { services } from './services';

export const serviceInventoryItems = sqliteTable('service_inventory_items', {
  id: text('id').primaryKey(),
  serviceId: text('service_id')
    .notNull()
    .references(() => services.id),
  inventoryItemId: text('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id),
  quantityUsed: integer('quantity_used').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const serviceInventoryServiceIdx = index('service_inventory_service_id_idx').on(
  serviceInventoryItems.serviceId,
);

export const serviceInventoryItemIdx = index('service_inventory_item_id_idx').on(
  serviceInventoryItems.inventoryItemId,
);

export type ServiceInventoryItem = typeof serviceInventoryItems.$inferSelect;
export type NewServiceInventoryItem = typeof serviceInventoryItems.$inferInsert;
