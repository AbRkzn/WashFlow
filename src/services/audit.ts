import { db } from '@/data/db';
import { AuditLogRepository, UserRepository } from '@/data/repositories';
import type { AuditLog } from '@/data/schema';

const auditRepository = new AuditLogRepository(db);
const userRepository = new UserRepository(db);

export interface AuditEntry {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

export interface AuditTrailEntry extends AuditLog {
  actorName: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await auditRepository.create({
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
    });
  } catch (error) {
    console.warn('Audit write failed (non-fatal)', error);
  }
}

/** Every audit entry, newest first, with the actor's display name. */
export async function listAuditTrail(limit = 200): Promise<AuditTrailEntry[]> {
  const entries = await auditRepository.listAll(limit);
  const users = await userRepository.listAll();
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return entries.map((entry) => ({
    ...entry,
    actorName: nameById.get(entry.actorId) ?? null,
  }));
}

/** Clears the on-device audit trail (soft-delete). Logs a clear marker afterwards. */
export async function clearAuditTrail(actorId: string): Promise<number> {
  const removed = await auditRepository.clearAll();
  await logAudit({
    actorId,
    action: 'audit-cleared',
    entity: 'audit_log',
    details: { removedCount: removed },
  });
  return removed;
}
