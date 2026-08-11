import { describe, expect, it } from 'vitest';

import {
  averageRevenuePerDay,
  formatMonth,
  isValidMonthKey,
  monthKey,
  monthRangeOf,
  shiftMonth,
} from '@/domain/monthly';

describe('monthly domain', () => {
  it('formats local-time month keys', () => {
    expect(monthKey(new Date(2026, 7, 8).getTime())).toBe('2026-08');
    expect(monthKey(new Date(2026, 0, 31).getTime())).toBe('2026-01');
  });

  it('validates month keys', () => {
    expect(isValidMonthKey('2026-08')).toBe(true);
    expect(isValidMonthKey('2026-12')).toBe(true);
    expect(isValidMonthKey('2026-13')).toBe(false);
    expect(isValidMonthKey('2026-00')).toBe(false);
    expect(isValidMonthKey('2026-8')).toBe(false);
    expect(isValidMonthKey('2026')).toBe(false);
  });

  it('computes an inclusive local-time month range', () => {
    const { from, to } = monthRangeOf('2026-08');
    expect(new Date(from).getMonth()).toBe(7);
    expect(new Date(from).getDate()).toBe(1);
    expect(new Date(to).getMonth()).toBe(7);
    expect(new Date(to).getDate()).toBe(31);
  });

  it('handles February in a leap year', () => {
    const { from, to } = monthRangeOf('2028-02');
    expect(new Date(to).getDate()).toBe(29);
  });

  it('formats a friendly month label', () => {
    expect(formatMonth('2026-08')).toBeTruthy();
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-08', 0)).toBe('2026-08');
  });

  it('averages revenue per active day, guarding division by zero', () => {
    expect(averageRevenuePerDay(300000, 3)).toBe(100000);
    expect(averageRevenuePerDay(300000, 0)).toBe(0);
    expect(averageRevenuePerDay(1, 3)).toBe(0);
  });
});
