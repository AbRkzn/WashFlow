import { describe, expect, it } from 'vitest';

import {
  DAY_CLOSE_STATUSES,
  assertValidDeclaredCash,
  dateKey,
  dayRangeOf,
  formatDay,
  varianceCents,
} from '@/domain/day-close';

describe('day-close domain', () => {
  it('formats local-time date keys', () => {
    expect(dateKey(new Date(2026, 7, 8).getTime())).toBe('2026-08-08');
    expect(dateKey(new Date(2026, 0, 3).getTime())).toBe('2026-01-03');
  });

  it('computes an inclusive local-time day range', () => {
    const { from, to } = dayRangeOf('2026-08-08');
    expect(new Date(from).getDate()).toBe(8);
    expect(new Date(to).getDate()).toBe(8);
    expect(to - from).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it('formats a friendly day label', () => {
    expect(formatDay('2026-08-08')).toBeTruthy();
  });

  it('variance is declared minus expected', () => {
    expect(varianceCents(120000, 100000)).toBe(20000);
    expect(varianceCents(80000, 100000)).toBe(-20000);
    expect(varianceCents(100000, 100000)).toBe(0);
  });

  it('validates declared cash', () => {
    expect(() => assertValidDeclaredCash(0)).not.toThrow();
    expect(() => assertValidDeclaredCash(500)).not.toThrow();
    expect(() => assertValidDeclaredCash(-1)).toThrow(/non-negative/);
    expect(() => assertValidDeclaredCash(Number.NaN)).toThrow(/non-negative/);
  });

  it('exposes the two day-close statuses', () => {
    expect(DAY_CLOSE_STATUSES).toEqual(['open', 'closed']);
  });
});
