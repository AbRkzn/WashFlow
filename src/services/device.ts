import { uuidv7 } from '@/utils/id';

let cachedDeviceId: string | null = null;

export function getDeviceId(): string {
  if (!cachedDeviceId) {
    cachedDeviceId = uuidv7();
  }
  return cachedDeviceId;
}

export function resetDeviceId(): void {
  cachedDeviceId = null;
}
