import { describe, expect, it } from 'vitest';

import {
  assertValidQuantityUsed,
  computeAutoDeduction,
} from '@/domain/service-inventory';

describe('service-inventory domain', () => {
  it('accepts a positive whole quantity used', () => {
    expect(() => assertValidQuantityUsed(1)).not.toThrow();
    expect(() => assertValidQuantityUsed(99)).not.toThrow();
  });

  it('rejects zero, negatives, and non-integers', () => {
    expect(() => assertValidQuantityUsed(0)).toThrow();
    expect(() => assertValidQuantityUsed(-2)).toThrow();
    expect(() => assertValidQuantityUsed(1.5)).toThrow();
    expect(() => assertValidQuantityUsed(Number.NaN)).toThrow();
  });

  it('deducts the full requested amount when stock allows', () => {
    expect(computeAutoDeduction(3, 10)).toBe(3);
    expect(computeAutoDeduction(1, 1)).toBe(1);
  });

  it('never deducts more than what is on hand', () => {
    expect(computeAutoDeduction(5, 2)).toBe(2);
    expect(computeAutoDeduction(5, 0)).toBe(0);
  });

  it('returns zero for invalid requests', () => {
    expect(computeAutoDeduction(0, 10)).toBe(0);
    expect(computeAutoDeduction(-1, 10)).toBe(0);
    expect(computeAutoDeduction(2.5, 10)).toBe(0);
  });
});
