import { describe, expect, it } from 'vitest';

import {
  CONFLICT_KINDS,
  CONFLICT_RESOLUTIONS,
  CONFLICT_STATUSES,
  FINANCIAL_ENTITIES,
  conflictKindForEntity,
  describeConflict,
  jobPriceChanged,
} from '@/domain/conflict';

describe('conflict domain', () => {
  it('maps financial entities to conflict kinds', () => {
    expect(conflictKindForEntity('payment')).toBe('payment');
    expect(conflictKindForEntity('void_request')).toBe('void');
    expect(conflictKindForEntity('job')).toBeNull();
    expect(conflictKindForEntity('customer')).toBeNull();
  });

  it('routes exactly the financial entities to review', () => {
    expect(FINANCIAL_ENTITIES).toEqual(['payment', 'void_request']);
  });

  it('detects a job price change between versions', () => {
    expect(jobPriceChanged({ price_cents: 50000 }, { price_cents: 60000 })).toBe(true);
    expect(jobPriceChanged({ price_cents: 50000 }, { price_cents: 50000 })).toBe(false);
    expect(jobPriceChanged({ price_cents: 50000 }, {})).toBe(false);
  });

  it('describes every kind', () => {
    for (const kind of CONFLICT_KINDS) {
      expect(describeConflict(kind).length).toBeGreaterThan(10);
    }
  });

  it('exposes the resolution and status sets', () => {
    expect(CONFLICT_RESOLUTIONS).toEqual(['approved', 'rejected', 'dismissed']);
    expect(CONFLICT_STATUSES).toEqual(['pending', 'resolved']);
  });
});
