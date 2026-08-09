import { db } from '@/data/db';
import { PhotoRepository } from '@/data/repositories';
import type { Photo, PhotoKind } from '@/data/schema';
import { enqueuePhotoUpload } from '@/services/photo-upload';

const photoRepository = new PhotoRepository(db);

const MAX_PER_KIND = 2;

export async function addJobPhoto(jobId: string, kind: PhotoKind, uri: string): Promise<Photo> {
  const existing = await photoRepository.listForJob(jobId);
  const count = existing.filter((photo) => photo.kind === kind).length;
  if (count >= MAX_PER_KIND) {
    throw new Error(`Maximum of ${MAX_PER_KIND} photos per stage.`);
  }
  const photo = await photoRepository.add({ jobId, kind, uri });
  await enqueuePhotoUpload(photo.id).catch((error) =>
    console.warn('Photo upload enqueue failed (non-fatal)', error),
  );
  return photo;
}

export function listJobPhotos(jobId: string): Promise<Photo[]> {
  return photoRepository.listForJob(jobId);
}
