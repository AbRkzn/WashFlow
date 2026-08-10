import { describe, expect, it } from 'vitest';

import {
  assertCanCashierVoid,
  canCashierVoid,
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from '@/domain/payment';

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

describe('payment methods', () => {
  it('supports cash, GCash, Maya, and card with cash as the default', () => {
    expect(PAYMENT_METHODS).toEqual(['cash', 'gcash', 'maya', 'card']);
    expect(DEFAULT_PAYMENT_METHOD).toBe('cash');
  });

  it('labels every method for the collect UI', () => {
    for (const method of PAYMENT_METHODS) {
      expect(PAYMENT_METHOD_LABELS[method].length).toBeGreaterThan(0);
    }
  });
});
