import { and, desc, eq, isNull } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { auditLog, type AuditLog } from '@/data/schema';

export interface NewAuditLog {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}

export class AuditLogRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<AuditLog | undefined> {
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.id, id), isNull(auditLog.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async create(input: NewAuditLog & { id?: string }): Promise<AuditLog> {
    const base = baseRecord();
    const record: AuditLog = {
      ...base,
      id: input.id ?? base.id,
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
    };
    await this.db.insert(auditLog).values(record);
    return record;
  }

  async listByActor(actorId: string, limit = 100): Promise<AuditLog[]> {
    return this.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.actorId, actorId), isNull(auditLog.deletedAt)))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  /** Every audit entry, newest first — for the audit trail viewer. */
  async listAll(limit = 200): Promise<AuditLog[]> {
    return this.db
      .select()
      .from(auditLog)
      .where(isNull(auditLog.deletedAt))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
}
