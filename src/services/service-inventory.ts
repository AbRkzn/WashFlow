import { db } from '@/data/db';
import {
  InventoryRepository,
  JobRepository,
  ServiceInventoryRepository,
  ServiceRepository,
  type ServiceInventoryEntry,
} from '@/data/repositories';
import { assertValidQuantityUsed, computeAutoDeduction, type ServiceInventoryUsage } from '@/domain/service-inventory';
import { logAudit } from '@/services/audit';
import { adjustStock } from '@/services/inventory';

const repository = new ServiceInventoryRepository(db);
const serviceRepository = new ServiceRepository(db);
const inventoryRepository = new InventoryRepository(db);
const jobRepository = new JobRepository(db);

export interface ServiceUsageConfigEntry {
  serviceId: string;
  serviceName: string;
  itemId: string;
  itemName: string;
  unit: string;
  quantityUsed: number;
}

export async function listServiceUsageConfig(): Promise<ServiceUsageConfigEntry[]> {
  const rows = await repository.listAllWithDetails();
  return rows
    .filter((row): row is ServiceInventoryEntry & { service: NonNullable<ServiceInventoryEntry['service']>; item: NonNullable<ServiceInventoryEntry['item']> } => row.service !== null && row.item !== null)
    .map((row) => ({
      serviceId: row.service.id,
      serviceName: row.service.name,
      itemId: row.item.id,
      itemName: row.item.name,
      unit: row.item.unit,
      quantityUsed: row.usage.quantityUsed,
    }));
}

export async function listUsagesForService(serviceId: string): Promise<ServiceInventoryUsage[]> {
  const rows = await repository.listForService(serviceId);
  return rows.map((row) => ({
    inventoryItemId: row.inventoryItemId,
    quantityUsed: row.quantityUsed,
  }));
}

/** Admin save: replaces the whole recipe for a service with the given list. */
export async function saveServiceUsages(
  serviceId: string,
  usages: ServiceInventoryUsage[],
  actorId: string,
): Promise<void> {
  for (const usage of usages) {
    assertValidQuantityUsed(usage.quantityUsed);
  }
  const seen = new Set<string>();
  for (const usage of usages) {
    if (seen.has(usage.inventoryItemId)) {
      throw new Error('An inventory item can only appear once per service recipe.');
    }
    seen.add(usage.inventoryItemId);
    const item = await inventoryRepository.findById(usage.inventoryItemId);
    if (!item) {
      throw new Error('Inventory item not found.');
    }
  }
  await repository.replaceForService(
    serviceId,
    usages.map((usage) => ({ serviceId, ...usage })),
  );
  await logAudit({
    actorId,
    action: 'service-inventory-recipe-saved',
    entity: 'service',
    entityId: serviceId,
    details: { usages },
  });
}

export interface AutoDeductResult {
  itemId: string;
  itemName: string;
  requested: number;
  deducted: number;
  shortfall: number;
}

/**
 * Auto-deducts the inventory recipe for a job's service. Called when a job is
 * completed. Never blocks completion and never drives stock below zero: each
 * line is clamped to what is on hand.
 */
export async function autoDeductForJob(jobId: string): Promise<AutoDeductResult[]> {
  const job = await jobRepository.findById(jobId);
  if (!job?.serviceId) {
    return [];
  }
  const service = await serviceRepository.findById(job.serviceId);
  if (!service) {
    return [];
  }
  const usages = await repository.listForService(service.id);
  const results: AutoDeductResult[] = [];
  for (const usage of usages) {
    const item = await inventoryRepository.findById(usage.inventoryItemId);
    if (!item) {
      continue;
    }
    const deducted = computeAutoDeduction(usage.quantityUsed, item.quantity);
    if (deducted <= 0) {
      continue;
    }
    await adjustStock(
      item.id,
      -deducted,
      'usage',
      'system',
      `Auto-deduct · ${service.name}`,
    );
    results.push({
      itemId: item.id,
      itemName: item.name,
      requested: usage.quantityUsed,
      deducted,
      shortfall: usage.quantityUsed - deducted,
    });
  }
  if (results.length > 0) {
    await logAudit({
      actorId: 'system',
      action: 'inventory-auto-deducted',
      entity: 'job',
      entityId: jobId,
      details: { serviceId: service.id, results },
    });
  }
  return results;
}
