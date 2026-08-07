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

  async create(input: NewAuditLog): Promise<AuditLog> {
    const record: AuditLog = {
      ...baseRecord(),
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
}
