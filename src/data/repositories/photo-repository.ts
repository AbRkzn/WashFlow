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
}
