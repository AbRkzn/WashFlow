import { asc, eq } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { photos, type Photo, type PhotoKind } from '@/data/schema';
import { enqueueChange } from '@/sync/outbox';

export class PhotoRepository {
  constructor(private readonly db: Database) {}

  async add(input: { jobId: string; kind: PhotoKind; uri: string }): Promise<Photo> {
    const record: Photo = {
      ...baseRecord(),
      jobId: input.jobId,
      kind: input.kind,
      uri: input.uri,
      uploadedAt: null,
    };
    await this.db.insert(photos).values(record);
    await enqueueChange('photo', record.id, 'upsert');
    return record;
  }

  async listForJob(jobId: string): Promise<Photo[]> {
    return this.db
      .select()
      .from(photos)
      .where(eq(photos.jobId, jobId))
      .orderBy(asc(photos.createdAt));
  }

  async findById(id: string): Promise<Photo | undefined> {
    const rows = await this.db.select().from(photos).where(eq(photos.id, id)).limit(1);
    return rows[0];
  }

  /** Marks the binary as uploaded to remote storage. Does NOT enqueue a sync change. */
  async markUploaded(id: string): Promise<void> {
    await this.db
      .update(photos)
      .set({ uploadedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(photos.id, id));
  }

  /** Points the local uri at a freshly downloaded binary. Local-only: no sync change. */
  async setLocalUri(id: string, uri: string): Promise<void> {
    await this.db
      .update(photos)
      .set({ uri, updatedAt: Date.now() })
      .where(eq(photos.id, id));
  }
}
