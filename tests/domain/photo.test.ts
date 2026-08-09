import { describe, expect, it } from 'vitest';

import { PHOTO_BUCKET, photoStoragePath } from '@/domain/photo';

describe('photo domain', () => {
  it('uses a private photos bucket', () => {
    expect(PHOTO_BUCKET).toBe('photos');
  });

  it('derives a deterministic storage path from the photo id', () => {
    expect(photoStoragePath('photo-123')).toBe('photos/photo-123.jpg');
    expect(photoStoragePath('018f6b3a-0000-7000-8000-000000000000')).toBe(
      'photos/018f6b3a-0000-7000-8000-000000000000.jpg',
    );
  });

  it('maps the same id to the same path (idempotent lookup)', () => {
    const id = 'job-photo-9';
    expect(photoStoragePath(id)).toBe(photoStoragePath(id));
  });
});
