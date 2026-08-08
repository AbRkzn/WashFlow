import { describe, expect, it } from 'vitest';

import {
  ACTIVE_STATUSES,
  JOB_STATUSES,
  VOIDABLE_STATUSES,
  WORKING_STATUSES,
  assertTransition,
  canTransition,
} from '@/domain/job';

describe('job lifecycle', () => {
  it('exposes the full status set in order', () => {
    expect(JOB_STATUSES).toEqual([
      'queued',
      'assigned',
      'in_progress',
      'quality_check',
      'completed',
      'paid',
      'voided',
    ]);
  });

  it('allows every forward transition', () => {
    expect(canTransition('queued', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'quality_check')).toBe(true);
    expect(canTransition('quality_check', 'completed')).toBe(true);
    expect(canTransition('completed', 'paid')).toBe(true);
  });

  it('allows rework backward to in_progress and back to queued', () => {
    expect(canTransition('quality_check', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'queued')).toBe(true);
  });

  it('allows voiding from every active status except already-voided', () => {
    for (const status of VOIDABLE_STATUSES) {
      expect(canTransition(status, 'voided'), `${status} -> voided`).toBe(true);
    }
    expect(canTransition('voided', 'voided')).toBe(false);
  });

  it('never allows a completed/paid job back into work', () => {
    expect(canTransition('paid', 'completed')).toBe(false);
    expect(canTransition('completed', 'in_progress')).toBe(false);
    expect(canTransition('paid', 'in_progress')).toBe(false);
  });

  it('never transitions out of voided', () => {
    for (const status of JOB_STATUSES) {
      expect(canTransition('voided', status)).toBe(false);
    }
  });

  it('assertTransition throws on invalid moves', () => {
    expect(() => assertTransition('queued', 'paid')).toThrow(/Cannot move/);
    expect(() => assertTransition('paid', 'queued')).toThrow();
  });

  it('keeps working/active status sets consistent', () => {
    expect(WORKING_STATUSES).toEqual(['queued', 'assigned', 'in_progress', 'quality_check']);
    expect(ACTIVE_STATUSES).toEqual([...WORKING_STATUSES, 'completed']);
    expect(WORKING_STATUSES.every((status) => JOB_STATUSES.includes(status))).toBe(true);
  });
});
