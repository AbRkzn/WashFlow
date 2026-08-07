import { uuidv7 } from '@/utils/id';
import { getDeviceId } from '@/services/device';

export function newId(): string {
  return uuidv7();
}

export function now(): number {
  return Date.now();
}

export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  deletedAt: number | null;
  serverSeq: number | null;
  originDevice: string | null;
}

export function baseRecord(): BaseRecord {
  return {
    id: uuidv7(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    deletedAt: null,
    serverSeq: null,
    originDevice: getDeviceId(),
  };
}
