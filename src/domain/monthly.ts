/**
 * Monthly trends (T3b). Aggregates day-level activity across a calendar month
 * in the device's local timezone. Pure helpers here; the aggregation itself
 * lives in src/services/monthly.ts.
 */

export interface MonthReport {
  month: string;
  jobCount: number;
  revenueCents: number;
  /** Revenue split by payment method (non-voided payments). */
  revenueByMethodCents: Record<string, number>;
  voidedCount: number;
  voidedAmountCents: number;
  expensesCents: number;
  netCents: number;
  closedDayCount: number;
  /** Distinct local calendar days with any payment, finished job, or expense. */
  activeDayCount: number;
  /** revenueCents / activeDayCount (0 when no activity). */
  avgRevenuePerDayCents: number;
}

/** Local-time calendar month key, e.g. `2026-08`. */
export function monthKey(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function isValidMonthKey(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/** Inclusive local-time range for a `YYYY-MM` key. */
export function monthRangeOf(month: string): { from: number; to: number } {
  const [year, monthIndex] = month.split('-').map(Number);
  const from = new Date(year, monthIndex - 1, 1).getTime();
  const to = new Date(year, monthIndex, 0, 23, 59, 59, 999).getTime();
  return { from, to };
}

/** Human-friendly month label, e.g. `August 2026`. */
export function formatMonth(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** Shifts a `YYYY-MM` key by `delta` months (negative = back). */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return monthKey(date.getTime());
}

export function averageRevenuePerDay(revenueCents: number, activeDayCount: number): number {
  if (activeDayCount <= 0) {
    return 0;
  }
  return Math.round(revenueCents / activeDayCount);
}
