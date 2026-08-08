import { describe, expect, it } from 'vitest';

import { assertCanCashierVoid, canCashierVoid } from '@/domain/payment';

describe('cashier void policy', () => {
  it('lets a cashier void only unclaimed queued jobs', () => {
    expect(canCashierVoid('queued')).toBe(true);
    for (const status of ['assigned', 'in_progress', 'quality_check', 'completed', 'paid', 'voided'] as const) {
      expect(canCashierVoid(status)).toBe(false);
    }
  });

  it('throws for claimed or paid jobs', () => {
    expect(() => assertCanCashierVoid('assigned')).toThrow(/manager approval/);
    expect(() => assertCanCashierVoid('paid')).toThrow(/manager approval/);
    expect(() => assertCanCashierVoid('queued')).not.toThrow();
  });
});
