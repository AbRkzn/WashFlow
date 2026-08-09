import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const PHOTO_UPLOAD_STATUSES = ['pending', 'uploaded', 'failed'] as const;

export type PhotoUploadStatus = (typeof PHOTO_UPLOAD_STATUSES)[number];

/**
 * Local-only queue for photo binary uploads. NOT a sync entity: this table
 * tracks the low-priority binary upload to Supabase Storage, separate from the
 * critical outbox (a photo row's metadata still syncs via the outbox; only the
 * bytes ride this queue).
 */
export const photoUploads = sqliteTable('photo_uploads', {
  id: text('id').primaryKey(),
  photoId: text('photo_id').notNull(),
  status: text('status').$type<PhotoUploadStatus>().notNull().default('pending'),
  attemptCount: integer('attempt_count').notNull().default(0),
  nextAttemptAt: integer('next_attempt_at').notNull().default(0),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const photoUploadStatusIndex = index('photo_uploads_status_idx').on(photoUploads.status);
export const photoUploadPhotoIndex = index('photo_uploads_photo_id_idx').on(photoUploads.photoId);

export type PhotoUpload = typeof photoUploads.$inferSelect;
export type NewPhotoUpload = typeof photoUploads.$inferInsert;
