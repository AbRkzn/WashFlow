import { db } from '@/data/db';
import { CustomerRepository } from '@/data/repositories';
import { seedIfEmpty } from '@/data/seed';

/**
 * One-tap Demo Mode. Seeds the app with realistic fake data on first run and
 * is a safe no-op (per-entity guards) on an already-populated device.
 * Returns `true` when demo data was freshly seeded.
 */
export async function loadDemoData(): Promise<boolean> {
  const customers = new CustomerRepository(db);
  const hadData = (await customers.list()).length > 0;
  await seedIfEmpty(db);
  return !hadData;
}
