import { describe, expect, it } from 'vitest';

import {
  auditActionLabel,
  auditDetailsSummary,
  auditEntityLabel,
} from '@/domain/audit';

describe('audit domain', () => {
  it('maps known actions to friendly labels', () => {
    expect(auditActionLabel('job-paid')).toBe('Payment collected');
    expect(auditActionLabel('sign-in')).toBe('Sign in');
    expect(auditActionLabel('day-close')).toBe('Day closed');
  });

  it('falls back to a dash-separated label for unknown actions', () => {
    expect(auditActionLabel('totally-new-action')).toBe('totally new action');
  });

  it('maps known entities and falls back for unknown ones', () => {
    expect(auditEntityLabel('void_request')).toBe('Void request');
    expect(auditEntityLabel('weird-table')).toBe('weird table');
  });

  it('summarises cents as pesos and skips empty details', () => {
    expect(auditDetailsSummary(null)).toBe('');
    expect(auditDetailsSummary('{"priceCents":19900}')).toBe('priceCents: ₱199.00');
    expect(auditDetailsSummary('{"plate":"ABC-123","reason":"scratch"}')).toBe(
      'plate: ABC-123 · reason: scratch',
    );
  });

  it('returns raw details when the JSON is malformed', () => {
    expect(auditDetailsSummary('not json')).toBe('not json');
  });
});