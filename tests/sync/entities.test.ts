import { describe, expect, it } from 'vitest';

import { SYNC_ENTITIES, columnMaps, dbColumnName, entityByName, rowFromRemote, rowToRemote } from '@/sync/entities';
import { jobs } from '@/data/schema';

describe('sync entities registry', () => {
  it('names every entity uniquely', () => {
    const names = SYNC_ENTITIES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('resolves known entities by name', () => {
    expect(entityByName('job')?.name).toBe('job');
    expect(entityByName('payment')?.name).toBe('payment');
  });

  it('returns undefined for unknown entities', () => {
    expect(entityByName('audit_log')).toBeUndefined();
  });

  it('excludes audit_log (local-only)', () => {
    expect(SYNC_ENTITIES.some((e) => e.name === 'audit_log')).toBe(false);
  });

  it('resolves the id column for each entity', () => {
    for (const entity of SYNC_ENTITIES) {
      expect(dbColumnName(entity.table, entity.idKey).length).toBeGreaterThan(0);
    }
  });

  it('has column parity for jobs (prop -> db and back)', () => {
    const row = {
      id: 'job-1',
      status: 'assigned',
      priceCents: 50000,
      serverSeq: 4,
      deletedAt: null,
    };
    const remote = rowToRemote(jobs, row);
    expect(remote).toMatchObject({
      id: 'job-1',
      status: 'assigned',
      price_cents: 50000,
      server_seq: 4,
      deleted_at: null,
    });
    expect(rowFromRemote(jobs, remote)).toEqual(row);
  });

  it('does not duplicate columns when maps are applied', () => {
    const { propToDb, dbToProp } = columnMaps(jobs);
    expect(propToDb.size).toBe(dbToProp.size);
    for (const [prop, db] of propToDb) {
      expect(dbToProp.get(db)).toBe(prop);
    }
  });
});
