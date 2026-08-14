import { db } from '@/data/db';
import { OutboxRepository } from '@/data/repositories';
import type { OutboxRow } from '@/data/schema';

const outboxRepository = new OutboxRepository(db);

const ENTITY_LABELS: Record<string, string> = {
  customer: 'Customer',
  vehicle: 'Vehicle',
  service: 'Service',
  job: 'Job',
  payment: 'Payment',
  void_request: 'Void request',
  appointment: 'Appointment',
  expense: 'Expense',
  day_close: 'Day close',
  inventory_item: 'Inventory',
  stock_adjustment: 'Stock',
  service_inventory_item: 'Service recipe',
  photo: 'Photo',
  recent_plate: 'Recent plate',
  setting: 'Setting',
  user: 'User',
};

export interface PendingSyncEntry {
  id: string;
  entity: string;
  entityLabel: string;
  entityId: string;
  op: string;
  attemptCount: number;
  lastError: string | null;
  createdAt: number;
}

function toPendingEntry(row: OutboxRow): PendingSyncEntry {
  return {
    id: row.id,
    entity: row.entity,
    entityLabel: ENTITY_LABELS[row.entity] ?? row.entity.replace(/-/g, ' '),
    entityId: row.entityId,
    op: row.op,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    createdAt: row.createdAt,
  };
}

/** Pending outbox rows, newest first, with human-friendly entity labels. */
export async function listPendingSyncEntries(): Promise<PendingSyncEntry[]> {
  const rows = await outboxRepository.listPending();
  return rows.map(toPendingEntry).sort((a, b) => b.createdAt - a.createdAt);
}