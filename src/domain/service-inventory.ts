export interface ServiceInventoryUsage {
  inventoryItemId: string;
  quantityUsed: number;
}

export const MAX_AUTO_DEDUCT = 100000;

export function assertValidQuantityUsed(quantityUsed: number): void {
  if (!Number.isInteger(quantityUsed) || quantityUsed <= 0) {
    throw new Error('Quantity used must be a positive whole number.');
  }
  if (quantityUsed > MAX_AUTO_DEDUCT) {
    throw new Error(`Quantity used cannot exceed ${MAX_AUTO_DEDUCT}.`);
  }
}

/**
 * Auto-deduction amount for a job completion: never exceeds what is on hand
 * (stock never goes negative) and never exceeds what the service recipe asks
 * for. Returns the actual quantity to deduct.
 */
export function computeAutoDeduction(
  requested: number,
  available: number,
): number {
  if (!Number.isInteger(requested) || requested <= 0) {
    return 0;
  }
  return Math.min(requested, Math.max(0, Math.floor(available)));
}
