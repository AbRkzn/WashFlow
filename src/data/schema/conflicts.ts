import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { ConflictKind, ConflictResolution, ConflictStatus } from '@/domain/conflict';
import { syncColumns } from './common';

export const conflictReviews = sqliteTable('conflict_reviews', {
  id: text('id').primaryKey(),
  kind: text('kind').$type<ConflictKind>().notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  description: text('description'),
  localRow: text('local_row'),
  remoteRow: text('remote_row'),
  status: text('status').$type<ConflictStatus>().notNull().default('pending'),
  resolution: text('resolution').$type<ConflictResolution>(),
  resolvedBy: text('resolved_by'),
  resolvedAt: integer('resolved_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const conflictReviewStatusIndex = index('conflict_reviews_status_idx').on(conflictReviews.status);
export const conflictReviewEntityIndex = index('conflict_reviews_entity_idx').on(
  conflictReviews.entity,
  conflictReviews.entityId,
);

export type ConflictReview = typeof conflictReviews.$inferSelect;
export type NewConflictReview = typeof conflictReviews.$inferInsert;
