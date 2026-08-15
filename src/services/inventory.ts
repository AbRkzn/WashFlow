import { db } from '@/data/db';
import {
  InventoryRepository,
  StockAdjustmentRepository,
  type NewInventoryItem,
} from '@/data/repositories';
import type { AdjustmentType } from '@/domain/inventory';
import { isLowStock } from '@/domain/inventory';
import { logAudit } from '@/services/audit';
import { logExpense } from '@/services/expenses';
import { notify } from '@/services/notifications';

const inventoryRepository = new InventoryRepository(db);
const stockAdjustmentRepository = new StockAdjustmentRepository(db);

export async function listInventory() {
  return inventoryRepository.listAll();
}

export async function listLowStockItems() {
  return inventoryRepository.listLowStock();
}

export async function listStockMovements(limit = 200) {
  return stockAdjustmentRepository.listRecentWithDetails(limit);
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
  costCents?: number,
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
  if (type === 'restock' && costCents !== undefined && Number.isFinite(costCents) && costCents > 0) {
    const notes = `Restock · ${item.name}${reason ? ` · ${reason}` : ''}`;
    await logExpense({ amountCents: costCents, category: 'supplies', description: notes }, actorId);
  }
  const updated = await inventoryRepository.findById(itemId);
  if (updated && !isLowStock(item) && isLowStock(updated)) {
    await notify('Low stock', `${updated.name} is down to ${updated.quantity}.`);
  }
  await logAudit({
    actorId,
    action: 'stock-adjusted',
    entity: 'inventory_item',
    entityId: itemId,
    details: { changeQty, type, reason: reason ?? null, costCents: costCents ?? null },
  });
}
