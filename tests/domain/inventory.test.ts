import { describe, expect, it } from 'vitest';

import { ADJUSTMENT_TYPES, INVENTORY_CATEGORIES, isLowStock } from '@/domain/inventory';

describe('inventory domain', () => {
  it('flags low stock at or below the threshold', () => {
    expect(isLowStock({ quantity: 1, lowStockThreshold: 2 })).toBe(true);
    expect(isLowStock({ quantity: 2, lowStockThreshold: 2 })).toBe(true);
    expect(isLowStock({ quantity: 3, lowStockThreshold: 2 })).toBe(false);
  });

  it('never flags stock without a threshold', () => {
    expect(isLowStock({ quantity: 0, lowStockThreshold: null })).toBe(false);
  });

  it('exposes categories and adjustment types', () => {
    expect(INVENTORY_CATEGORIES).toContain('cleaning');
    expect(INVENTORY_CATEGORIES).toContain('chemicals');
    expect(ADJUSTMENT_TYPES).toEqual(['restock', 'usage', 'waste', 'correction']);
  });
});
