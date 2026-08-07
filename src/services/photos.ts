import { db } from '@/data/db';
import { PhotoRepository } from '@/data/repositories';
import type { Photo, PhotoKind } from '@/data/schema';

const photoRepository = new PhotoRepository(db);

const MAX_PER_KIND = 2;

export async function addJobPhoto(jobId: string, kind: PhotoKind, uri: string): Promise<Photo> {
  const existing = await photoRepository.listForJob(jobId);
  const count = existing.filter((photo) => photo.kind === kind).length;
  if (count >= MAX_PER_KIND) {
    throw new Error(`Maximum of ${MAX_PER_KIND} photos per stage.`);
  }
  return photoRepository.add({ jobId, kind, uri });
}

export function listJobPhotos(jobId: string): Promise<Photo[]> {
  return photoRepository.listForJob(jobId);
}
