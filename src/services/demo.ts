import { db } from '@/data/db';
import { CustomerRepository, JobRepository } from '@/data/repositories';
import { seedDemoData, seedIfEmpty } from '@/data/seed';

/**
 * One-tap Demo Mode. Seeds base entities (services/washers/settings/inventory)
 * via `seedIfEmpty`, then force-runs the idempotent demo dataset so queued jobs,
 * bookings, and payments always appear even on a device that already has data.
 * Returns `true` when demo jobs were freshly seeded.
 */
export async function loadDemoData(): Promise<boolean> {
  const customers = new CustomerRepository(db);
  const hadData = (await customers.list()).length > 0;
  const jobs = new JobRepository(db);
  const hadDemoJobs = (await jobs.findById('seed-job-queued-juan')) !== undefined;
  await seedIfEmpty(db);
  await seedDemoData(db);
  return !hadData || !hadDemoJobs;
}
