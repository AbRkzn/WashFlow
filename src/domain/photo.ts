export const PHOTO_BUCKET = 'photos';

/** Deterministic object key for a photo binary in the storage bucket. */
export function photoStoragePath(photoId: string): string {
  return `photos/${photoId}.jpg`;
}
