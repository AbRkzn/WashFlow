import { db } from '@/data/db';
import {
  JobRepository,
  ServiceRepository,
  type NewService,
  type ServicePatch,
} from '@/data/repositories';

const serviceRepository = new ServiceRepository(db);
const jobRepository = new JobRepository(db);

export function listAllServices() {
  return serviceRepository.listAll();
}

export function createService(input: NewService) {
  return serviceRepository.create(input);
}

export function updateService(id: string, patch: ServicePatch) {
  return serviceRepository.update(id, patch);
}

export function deleteService(id: string) {
  return serviceRepository.softDelete(id);
}

/**
 * Heals duplicate service presets. The seed used to create the default
 * services with fresh UUIDs on every empty device, so reinstalls pushed
 * parallel sets to the sync mirror and every device pulled them all. For each
 * name that appears more than once, keep the one referenced by the most live
 * jobs (tie-break: earliest created) and soft-delete the rest. Soft-deletes
 * enqueue tombstones, so the cleanup propagates to the server and other
 * devices on the next sync. Idempotent and safe to run on every boot/pull.
 */
export async function dedupeDuplicateServices(): Promise<void> {
  const services = await serviceRepository.listAll();
  const counts = await jobRepository.listServiceReferenceCounts();
  const byName = new Map<string, (typeof services)[number][]>();
  for (const service of services) {
    const key = service.name.trim().toLowerCase();
    const group = byName.get(key);
    if (group) {
      group.push(service);
    } else {
      byName.set(key, [service]);
    }
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => {
      const refs = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      return refs !== 0 ? refs : a.createdAt - b.createdAt;
    });
    for (const duplicate of group.slice(1)) {
      await serviceRepository.softDelete(duplicate.id);
    }
  }
}
