import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './common';
import { jobs } from './jobs';

export const PHOTO_KINDS = ['before', 'after'] as const;

export type PhotoKind = (typeof PHOTO_KINDS)[number];

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id),
  kind: text('kind').$type<PhotoKind>().notNull(),
  uri: text('uri').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  ...syncColumns,
});

export const photoJobIndex = index('photos_job_id_idx').on(photos.jobId);

export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
