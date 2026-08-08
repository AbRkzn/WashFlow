import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  appointments,
  customers,
  dayCloses,
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
  { name: 'day_close', table: dayCloses, idKey: 'id' },
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

/**
 * Drizzle 0.45 stores a table's columns under the internal
 * `Symbol.for('drizzle:Columns')` key (there is no public `table._`).
 */
const COLUMNS_KEY = Symbol.for('drizzle:Columns');

function tableColumns(table: AnySQLiteTable): Record<string, { name: string }> {
  return ((table as unknown as Record<symbol, Record<string, { name: string }> | undefined>)[COLUMNS_KEY]) ?? {};
}

/** Maps a Drizzle property name to its snake_case DB column name. */
export function dbColumnName(table: AnySQLiteTable, prop: string): string {
  return tableColumns(table)[prop]?.name ?? prop;
}

export function columnMaps(table: AnySQLiteTable): {
  propToDb: Map<string, string>;
  dbToProp: Map<string, string>;
} {
  const entries = Object.entries(tableColumns(table));
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
