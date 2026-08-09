import { and, asc, count, eq, lte, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { photoUploads, type PhotoUpload, type PhotoUploadStatus } from '@/data/schema';

export class PhotoUploadRepository {
  constructor(private readonly db: Database) {}

  /** Creates a pending upload entry for a photo. No-op if one already exists. */
  async enqueue(photoId: string): Promise<void> {
    const existing = await this.findForPhoto(photoId);
    if (existing) {
      return;
    }
    const record: PhotoUpload = {
      ...baseRecord(),
      photoId,
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
      lastError: null,
    };
    await this.db.insert(photoUploads).values(record);
  }

  async findForPhoto(photoId: string): Promise<PhotoUpload | undefined> {
    const rows = await this.db
      .select()
      .from(photoUploads)
      .where(eq(photoUploads.photoId, photoId))
      .limit(1);
    return rows[0];
  }

  async listDue(): Promise<PhotoUpload[]> {
    return this.db
      .select()
      .from(photoUploads)
      .where(and(eq(photoUploads.status, 'pending'), lte(photoUploads.nextAttemptAt, Date.now())))
      .orderBy(asc(photoUploads.createdAt));
  }

  async countPending(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(photoUploads)
      .where(eq(photoUploads.status, 'pending'));
    return rows[0]?.value ?? 0;
  }

  async markUploaded(id: string): Promise<void> {
    await this.db
      .update(photoUploads)
      .set({ status: 'uploaded', lastError: null, updatedAt: Date.now() })
      .where(eq(photoUploads.id, id));
  }

  async markFailed(id: string, error: string, nextAttemptAt: number): Promise<void> {
    await this.db
      .update(photoUploads)
      .set({
        status: 'failed',
        lastError: error,
        attemptCount: sql`${photoUploads.attemptCount} + 1`,
        nextAttemptAt,
        updatedAt: Date.now(),
      })
      .where(eq(photoUploads.id, id));
  }

  async retryDue(): Promise<void> {
    await this.db
      .update(photoUploads)
      .set({ status: 'pending', updatedAt: Date.now() })
      .where(and(eq(photoUploads.status, 'failed'), lte(photoUploads.nextAttemptAt, Date.now())));
  }
}

export type { PhotoUploadStatus };
