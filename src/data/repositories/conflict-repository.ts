import { and, asc, desc, eq, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import {
  conflictReviews,
  jobs,
  payments,
  type ConflictReview,
  type Job,
  type Payment,
} from '@/data/schema';
import type { ConflictKind, ConflictResolution } from '@/domain/conflict';

export interface NewConflictReview {
  kind: ConflictKind;
  entity: string;
  entityId: string;
  description?: string | null;
  localRow?: Record<string, unknown> | null;
  remoteRow?: Record<string, unknown> | null;
}

export interface ConflictReviewEntry {
  conflict: ConflictReview;
  job: Job | null;
  payment: Payment | null;
}

export class ConflictReviewRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewConflictReview): Promise<ConflictReview> {
    const record: ConflictReview = {
      ...baseRecord(),
      kind: input.kind,
      entity: input.entity,
      entityId: input.entityId,
      description: input.description ?? null,
      localRow: input.localRow ? JSON.stringify(input.localRow) : null,
      remoteRow: input.remoteRow ? JSON.stringify(input.remoteRow) : null,
      status: 'pending',
      resolution: null,
      resolvedBy: null,
      resolvedAt: null,
    };
    await this.db.insert(conflictReviews).values(record);
    return record;
  }

  async findById(id: string): Promise<ConflictReview | undefined> {
    const rows = await this.db
      .select()
      .from(conflictReviews)
      .where(eq(conflictReviews.id, id))
      .limit(1);
    return rows[0];
  }

  async hasPendingFor(entity: string, entityId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: conflictReviews.id })
      .from(conflictReviews)
      .where(
        and(
          eq(conflictReviews.entity, entity),
          eq(conflictReviews.entityId, entityId),
          eq(conflictReviews.status, 'pending'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async countPending(): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(conflictReviews)
      .where(eq(conflictReviews.status, 'pending'));
    return rows[0]?.value ?? 0;
  }

  async listPendingWithDetails(): Promise<ConflictReviewEntry[]> {
    const rows = await this.db
      .select({
        conflict: conflictReviews,
        job: jobs,
        payment: payments,
      })
      .from(conflictReviews)
      .leftJoin(jobs, eq(conflictReviews.entityId, jobs.id))
      .leftJoin(payments, eq(conflictReviews.entityId, payments.id))
      .where(eq(conflictReviews.status, 'pending'))
      .orderBy(asc(conflictReviews.createdAt));
    return rows.map((row) => ({
      conflict: row.conflict,
      job: row.job ?? null,
      payment: row.payment ?? null,
    }));
  }

  async listRecent(limit = 20): Promise<ConflictReview[]> {
    return this.db
      .select()
      .from(conflictReviews)
      .orderBy(desc(conflictReviews.createdAt))
      .limit(limit);
  }

  async markResolved(
    id: string,
    resolution: ConflictResolution,
    resolvedBy: string,
    resolvedAt: number = Date.now(),
  ): Promise<boolean> {
    const rows = await this.db
      .update(conflictReviews)
      .set({
        status: 'resolved',
        resolution,
        resolvedBy,
        resolvedAt,
        updatedAt: Date.now(),
        version: sql`${conflictReviews.version} + 1`,
      })
      .where(and(eq(conflictReviews.id, id), eq(conflictReviews.status, 'pending')))
      .returning({ id: conflictReviews.id });
    return rows.length > 0;
  }
}
