import type { OutboxRow } from '@/data/schema';

/**
 * Exponential backoff for outbox retries, capped at 60s:
 * attempt n waits `1000 * 2^n` ms (1s, 2s, 4s, ...).
 */
export function backoffMs(attemptCount: number): number {
  return Math.min(60_000, 1_000 * 2 ** attemptCount);
}

/**
 * Reduces a set of queued outbox entries to one per `entity:entityId` before
 * pushing. Later entries are newer, so the last one for a key wins (it carries
 * the full latest row state). Output is ordered by createdAt for deterministic
 * server sequencing.
 */
export function coalescePending(entries: OutboxRow[]): OutboxRow[] {
  const latest = new Map<string, OutboxRow>();
  for (const entry of entries) {
    latest.set(`${entry.entity}:${entry.entityId}`, entry);
  }
  return Array.from(latest.values()).sort((a, b) => a.createdAt - b.createdAt);
}
