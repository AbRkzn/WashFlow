import type { DayCloseRow } from '../types';

export interface MethodBreakdownEntry {
  method: string;
  cents: number;
}

export function parseMethodBreakdown(dayClose: DayCloseRow): MethodBreakdownEntry[] {
  try {
    const raw: Record<string, number> = JSON.parse(dayClose.revenue_by_method_cents || '{}');
    return Object.entries(raw)
      .map(([method, cents]) => ({ method, cents: Number(cents) || 0 }))
      .filter((entry) => entry.cents !== 0)
      .sort((a, b) => b.cents - a.cents);
  } catch {
    return [];
  }
}
