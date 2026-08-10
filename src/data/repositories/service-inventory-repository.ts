import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import {
  inventoryItems,
  serviceInventoryItems,
  services,
  type InventoryItem,
  type Service,
  type ServiceInventoryItem,
} from '@/data/schema';
import { enqueueChange } from '@/sync/outbox';

export interface NewServiceInventoryItem {
  serviceId: string;
  inventoryItemId: string;
  quantityUsed: number;
}

export interface ServiceInventoryEntry {
  usage: ServiceInventoryItem;
  service: Service | null;
  item: InventoryItem | null;
}

export class ServiceInventoryRepository {
  constructor(private readonly db: Database) {}

  async listAll(): Promise<ServiceInventoryItem[]> {
    return this.db
      .select()
      .from(serviceInventoryItems)
      .where(isNull(serviceInventoryItems.deletedAt))
      .orderBy(asc(serviceInventoryItems.createdAt));
  }

  async listForService(serviceId: string): Promise<ServiceInventoryItem[]> {
    return this.db
      .select()
      .from(serviceInventoryItems)
      .where(
        and(
          eq(serviceInventoryItems.serviceId, serviceId),
          isNull(serviceInventoryItems.deletedAt),
        ),
      )
      .orderBy(asc(serviceInventoryItems.createdAt));
  }

  /** Usage rows joined with service + inventory item — for the admin config screen. */
  async listAllWithDetails(): Promise<ServiceInventoryEntry[]> {
    const rows = await this.db
      .select({
        usage: serviceInventoryItems,
        service: services,
        item: inventoryItems,
      })
      .from(serviceInventoryItems)
      .leftJoin(services, eq(serviceInventoryItems.serviceId, services.id))
      .leftJoin(inventoryItems, eq(serviceInventoryItems.inventoryItemId, inventoryItems.id))
      .where(isNull(serviceInventoryItems.deletedAt))
      .orderBy(
        asc(services.sortOrder),
        asc(services.name),
        asc(inventoryItems.name),
      );
    return rows.map((row) => ({
      usage: row.usage,
      service: row.service,
      item: row.item,
    }));
  }

  async create(input: NewServiceInventoryItem): Promise<ServiceInventoryItem> {
    const record: ServiceInventoryItem = {
      ...baseRecord(),
      serviceId: input.serviceId,
      inventoryItemId: input.inventoryItemId,
      quantityUsed: input.quantityUsed,
    };
    await this.db.insert(serviceInventoryItems).values(record);
    await enqueueChange('service_inventory_item', record.id, 'upsert');
    return record;
  }

  async updateQuantityUsed(id: string, quantityUsed: number): Promise<void> {
    await this.db
      .update(serviceInventoryItems)
      .set({ quantityUsed, updatedAt: Date.now(), version: sql`${serviceInventoryItems.version} + 1` })
      .where(eq(serviceInventoryItems.id, id));
    await enqueueChange('service_inventory_item', id, 'upsert');
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(serviceInventoryItems)
      .set({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        version: sql`${serviceInventoryItems.version} + 1`,
      })
      .where(eq(serviceInventoryItems.id, id));
    await enqueueChange('service_inventory_item', id, 'delete');
  }

  /** Replaces every usage row for a service with the given list (admin save). */
  async replaceForService(
    serviceId: string,
    usages: NewServiceInventoryItem[],
  ): Promise<void> {
    const existing = await this.listForService(serviceId);
    for (const row of existing) {
      await this.softDelete(row.id);
    }
    for (const usage of usages) {
      await this.create(usage);
    }
  }
}
