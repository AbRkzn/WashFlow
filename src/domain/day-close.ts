/**
 * Day-close (P9). A "business day" is a calendar date in the device's local
 * timezone. Closing a day is manual, idempotent (exactly one close per day),
 * and offline-capable. Only an Admin can reopen a closed day.
 */

export const DAY_CLOSE_STATUSES = ['open', 'closed'] as const;

export type DayCloseStatus = (typeof DAY_CLOSE_STATUSES)[number];

export const DAY_CLOSE_STATUS_LABELS: Record<DayCloseStatus, string> = {
  open: 'Open',
  closed: 'Closed',
};

/** Snapshot of a business day's activity, computed from local data. */
export interface DayReport {
  day: string;
  jobCount: number;
  revenueCents: number;
  /** Revenue split by payment method (non-voided payments). */
  revenueByMethodCents: Record<string, number>;
  voidedCount: number;
  voidedAmountCents: number;
  expensesCents: number;
  /** Appointments marked no-show on this day. */
  noShowCount: number;
  expectedCashCents: number;
}

/** Local-time calendar date key, e.g. `2026-08-08`. */
export function dateKey(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dayRangeOf(day: string): { from: number; to: number } {
  const [year, month, date] = day.split('-').map(Number);
  const from = new Date(year, month - 1, date).getTime();
  return { from, to: from + 24 * 60 * 60 * 1000 - 1 };
}

/** Human-friendly day label, e.g. `Aug 8, 2026`. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString();
}

/** Declared minus expected; positive = over, negative = short. */
export function varianceCents(declaredCents: number, expectedCents: number): number {
  return declaredCents - expectedCents;
}

export function assertValidDeclaredCash(declaredCents: number): void {
  if (!Number.isFinite(declaredCents) || declaredCents < 0) {
    throw new Error('Declared cash must be a non-negative amount.');
  }
}
