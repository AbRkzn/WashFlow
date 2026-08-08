import { db } from '@/data/db';
import {
  InventoryRepository,
  StockAdjustmentRepository,
  type InventoryItemPatch,
  type NewInventoryItem,
} from '@/data/repositories';
import type { AdjustmentType } from '@/domain/inventory';
import { logAudit } from '@/services/audit';

const inventoryRepository = new InventoryRepository(db);
const stockAdjustmentRepository = new StockAdjustmentRepository(db);

export async function listInventory() {
  return inventoryRepository.listAll();
}

export async function listLowStockItems() {
  return inventoryRepository.listLowStock();
}

export async function createInventoryItem(
  input: NewInventoryItem,
  actorId: string,
): Promise<void> {
  const item = await inventoryRepository.create(input);
  await logAudit({
    actorId,
    action: 'inventory-item-created',
    entity: 'inventory_item',
    entityId: item.id,
    details: { name: item.name },
  });
}

export async function updateInventoryItem(
  itemId: string,
  patch: InventoryItemPatch,
  actorId: string,
): Promise<void> {
  await inventoryRepository.update(itemId, patch);
  await logAudit({
    actorId,
    action: 'inventory-item-updated',
    entity: 'inventory_item',
    entityId: itemId,
    details: { ...patch },
  });
}

export async function deleteInventoryItem(itemId: string, actorId: string): Promise<void> {
  await inventoryRepository.softDelete(itemId);
  await logAudit({
    actorId,
    action: 'inventory-item-deleted',
    entity: 'inventory_item',
    entityId: itemId,
  });
}

export async function adjustStock(
  itemId: string,
  changeQty: number,
  type: AdjustmentType,
  actorId: string,
  reason?: string,
): Promise<void> {
  if (!Number.isInteger(changeQty) || changeQty === 0) {
    throw new Error('Stock change must be a non-zero whole number.');
  }
  const item = await inventoryRepository.findById(itemId);
  if (!item) {
    throw new Error('Inventory item not found.');
  }
  await inventoryRepository.applyQuantityChange(itemId, changeQty);
  await stockAdjustmentRepository.create({
    itemId,
    changeQty,
    type,
    reason: reason ?? null,
    adjustedBy: actorId,
  });
  await logAudit({
    actorId,
    action: 'stock-adjusted',
    entity: 'inventory_item',
    entityId: itemId,
    details: { changeQty, type, reason: reason ?? null },
  });
}

export interface StockMovementEntry {
  item: NonNullable<Awaited<ReturnType<typeof inventoryRepository.findById>>>;
  changeQty: number;
  type: AdjustmentType;
  reason: string | null;
  createdAt: number;
}

export async function listStockMovements(): Promise<StockMovementEntry[]> {
  const adjustments = await stockAdjustmentRepository.listRecent(100);
  const items = await inventoryRepository.listAll();
  const itemById = new Map(items.map((item) => [item.id, item]));
  return adjustments
    .map((adjustment) => {
      const item = itemById.get(adjustment.itemId);
      if (!item) return null;
      return {
        item,
        changeQty: adjustment.changeQty,
        type: adjustment.type,
        reason: adjustment.reason,
        createdAt: adjustment.createdAt,
      };
    })
    .filter((entry): entry is StockMovementEntry => entry !== null);
}
