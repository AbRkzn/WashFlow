import { integer, text } from 'drizzle-orm/sqlite-core';

export const syncColumns = {
  version: integer('version').notNull().default(0),
  serverSeq: integer('server_seq'),
  deletedAt: integer('deleted_at'),
  originDevice: text('origin_device'),
} as const;
