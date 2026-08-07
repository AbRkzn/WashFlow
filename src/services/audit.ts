import { db } from '@/data/db';
import { AuditLogRepository } from '@/data/repositories';

const auditRepository = new AuditLogRepository(db);

export interface AuditEntry {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
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
