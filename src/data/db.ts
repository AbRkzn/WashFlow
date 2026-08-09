import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';
import migrations from '../../drizzle/migrations';

const sqlite = openDatabaseSync('washflow.db');

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;

export async function initDatabase(): Promise<void> {
  try {
    await migrate(db, migrations);
  } catch (error) {
    console.warn(
      'Migration failed; wiping tables to recover from a stale schema (seed will repopulate demo data).',
      error,
    );
    wipeAllTables();
    await migrate(db, migrations);
  }
}

/** Drops every user table so migrations can re-run from a clean slate. */
function wipeAllTables(): void {
  const rows = sqlite.getAllSync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  for (const { name } of rows) {
    sqlite.execSync(`DROP TABLE IF EXISTS \`${name}\``);
  }
}
