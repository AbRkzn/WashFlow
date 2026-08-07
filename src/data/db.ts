import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';
import migrations from '../../drizzle/migrations';

const sqlite = openDatabaseSync('washflow.db');

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;

export async function initDatabase(): Promise<void> {
  await migrate(db, migrations);
}
