import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  appointments,
  customers,
  expenses,
  inventoryItems,
  jobs,
  payments,
  photos,
  recentPlates,
  services,
  settings,
  stockAdjustments,
  users,
  vehicles,
  voidRequests,
} from '@/data/schema';

export interface SyncEntity {
  name: string;
  table: AnySQLiteTable;
  idKey: 'id' | 'key';
}

/**
 * Entities that participate in the sync engine. `audit_log` is intentionally
 * excluded: per-user audit trails are local-only.
 */
export const SYNC_ENTITIES: SyncEntity[] = [
  { name: 'customer', table: customers, idKey: 'id' },
  { name: 'vehicle', table: vehicles, idKey: 'id' },
  { name: 'service', table: services, idKey: 'id' },
  { name: 'job', table: jobs, idKey: 'id' },
  { name: 'payment', table: payments, idKey: 'id' },
  { name: 'void_request', table: voidRequests, idKey: 'id' },
  { name: 'appointment', table: appointments, idKey: 'id' },
  { name: 'expense', table: expenses, idKey: 'id' },
  { name: 'inventory_item', table: inventoryItems, idKey: 'id' },
  { name: 'stock_adjustment', table: stockAdjustments, idKey: 'id' },
  { name: 'photo', table: photos, idKey: 'id' },
  { name: 'recent_plate', table: recentPlates, idKey: 'id' },
  { name: 'setting', table: settings, idKey: 'key' },
  { name: 'user', table: users, idKey: 'id' },
];

export function entityByName(name: string): SyncEntity | undefined {
  return SYNC_ENTITIES.find((entity) => entity.name === name);
}

export function columnMaps(table: AnySQLiteTable): {
  propToDb: Map<string, string>;
  dbToProp: Map<string, string>;
} {
  const entries = Object.entries(
    table._.columns as Record<string, { name: string }>,
  );
  return {
    propToDb: new Map(entries.map(([prop, column]) => [prop, column.name])),
    dbToProp: new Map(entries.map(([prop, column]) => [column.name, prop])),
  };
}

export function rowToRemote(table: AnySQLiteTable, row: Record<string, unknown>): Record<string, unknown> {
  const { propToDb } = columnMaps(table);
  return Object.fromEntries(
    Object.entries(row).map(([prop, value]) => [propToDb.get(prop) ?? prop, value]),
  );
}

export function rowFromRemote(table: AnySQLiteTable, row: Record<string, unknown>): Record<string, unknown> {
  const { dbToProp } = columnMaps(table);
  return Object.fromEntries(
    Object.entries(row).map(([dbKey, value]) => [dbToProp.get(dbKey) ?? dbKey, value]),
  );
}
