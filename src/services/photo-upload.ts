import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/api/supabase';
import { db } from '@/data/db';
import { PhotoRepository, PhotoUploadRepository } from '@/data/repositories';
import { photos } from '@/data/schema';
import { PHOTO_BUCKET, photoStoragePath } from '@/domain/photo';
import { backoffMs } from '@/sync/sync-logic';

const photoRepository = new PhotoRepository(db);
const photoUploadRepository = new PhotoUploadRepository(db);

let uploading = false;
let hydrating = false;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function readBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return base64ToBytes(base64);
}

async function ensurePhotoDir(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}photos/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/** Queues a photo binary for deferred upload. No-op if already queued/uploaded. */
export async function enqueuePhotoUpload(photoId: string): Promise<void> {
  await photoUploadRepository.enqueue(photoId);
}

/**
 * Uploads queued photo binaries to Supabase Storage. Low priority: never runs
 * inside a critical sync cycle, and failures back off instead of blocking.
 * Single-flight guarded.
 */
export async function processPhotoUploads(): Promise<void> {
  if (uploading) return;
  uploading = true;
  try {
    await photoUploadRepository.retryDue();
    const due = await photoUploadRepository.listDue();
    for (const entry of due) {
      const photo = await photoRepository.findById(entry.photoId);
      if (!photo) {
        await photoUploadRepository.markUploaded(entry.id);
        continue;
      }
      try {
        const bytes = await readBytes(photo.uri);
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(photoStoragePath(photo.id), bytes, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        if (error) {
          throw error;
        }
        await photoUploadRepository.markUploaded(entry.id);
        await photoRepository.markUploaded(photo.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const nextAttemptAt = Date.now() + backoffMs(entry.attemptCount);
        await photoUploadRepository.markFailed(entry.id, message, nextAttemptAt);
      }
    }
  } finally {
    uploading = false;
  }
}

/**
 * Downloads photo binaries that exist remotely but not locally (e.g. pulled
 * from another device). Runs after sync, best-effort, single-flight guarded.
 */
export async function hydrateMissingPhotos(): Promise<void> {
  if (hydrating) return;
  hydrating = true;
  try {
    const dir = await ensurePhotoDir();
    const local = await db.select().from(photos);
    for (const photo of local) {
      if (!photo.uploadedAt) continue;
      const info = await FileSystem.getInfoAsync(photo.uri);
      if (info.exists && !info.isDirectory) continue;
      const dest = `${dir}${photo.id}.jpg`;
      try {
        const { data, error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .download(photoStoragePath(photo.id));
        if (error) {
          throw error;
        }
        const base64 = await blobToBase64(data);
        await FileSystem.writeAsStringAsync(dest, base64, { encoding: 'base64' });
        await photoRepository.setLocalUri(photo.id, dest);
        await photoRepository.markUploaded(photo.id);
      } catch (error) {
        console.warn(`Photo hydration failed (non-fatal) ${photo.id}`, error);
      }
    }
  } finally {
    hydrating = false;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
