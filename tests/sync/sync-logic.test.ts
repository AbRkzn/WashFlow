import { describe, expect, it } from 'vitest';

import type { OutboxRow } from '@/data/schema';
import { backoffMs, coalescePending } from '@/sync/sync-logic';

function entry(overrides: Partial<OutboxRow>): OutboxRow {
  return {
    id: 'e',
    entity: 'job',
    entityId: 'j1',
    op: 'upsert',
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: 0,
    lastError: null,
    createdAt: 0,
    updatedAt: 0,
    originDevice: null,
    ...overrides,
  };
}

describe('sync-logic backoffMs', () => {
  it('starts at 1s for the first attempt', () => {
    expect(backoffMs(0)).toBe(1_000);
  });

  it('doubles each attempt', () => {
    expect(backoffMs(1)).toBe(2_000);
    expect(backoffMs(2)).toBe(4_000);
    expect(backoffMs(3)).toBe(8_000);
  });

  it('caps at 60s', () => {
    expect(backoffMs(6)).toBe(60_000);
    expect(backoffMs(10)).toBe(60_000);
  });
});

describe('sync-logic coalescePending', () => {
  it('keeps the latest entry per entity:entityId', () => {
    const older = entry({ entityId: 'j1', createdAt: 100, attemptCount: 0 });
    const newer = entry({ entityId: 'j1', createdAt: 200, attemptCount: 1 });
    const result = coalescePending([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newer);
  });

  it('keeps distinct rows and sorts by createdAt', () => {
    const a = entry({ entityId: 'j1', createdAt: 300 });
    const b = entry({ entityId: 'j2', createdAt: 100 });
    const c = entry({ entityId: 'j3', createdAt: 200 });
    const result = coalescePending([a, b, c]);
    expect(result.map((r) => r.entityId)).toEqual(['j2', 'j3', 'j1']);
  });

  it('groups by entity name, not just entityId', () => {
    const job = entry({ entity: 'job', entityId: 'x', createdAt: 100 });
    const payment = entry({ entity: 'payment', entityId: 'x', createdAt: 200 });
    const result = coalescePending([job, payment]);
    expect(result).toHaveLength(2);
  });

  it('returns empty for no entries', () => {
    expect(coalescePending([])).toEqual([]);
  });
});
