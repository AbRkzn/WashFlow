export const INVENTORY_CATEGORIES = [
  'cleaning',
  'chemicals',
  'interior',
  'tools',
  'supplies',
  'other',
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  cleaning: 'Cleaning',
  chemicals: 'Chemicals',
  interior: 'Interior',
  tools: 'Tools',
  supplies: 'Supplies',
  other: 'Other',
};

export const ADJUSTMENT_TYPES = ['restock', 'usage', 'waste', 'correction'] as const;

export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  restock: 'Restock',
  usage: 'Usage',
  waste: 'Waste',
  correction: 'Correction',
};

export interface InventoryItemLike {
  quantity: number;
  lowStockThreshold: number | null;
}

export function isLowStock(item: InventoryItemLike): boolean {
  if (item.lowStockThreshold === null) {
    return false;
  }
  return item.quantity <= item.lowStockThreshold;
}
