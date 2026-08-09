import { asc, eq } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { users, type User } from '@/data/schema';
import type { UserRole } from '@/domain/user';
import { enqueueChange } from '@/sync/outbox';

export interface UpsertUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export class UserRepository {
  constructor(private readonly db: Database) {}

  async upsert(input: UpsertUser): Promise<User> {
    let existing = await this.findById(input.id);
    // If not found by id, allow a row with the same email to be migrated to the
    // authoritative account id. This covers demo `seed-washer-*` rows left by
    // the seed, whose emails now belong to real provisioned accounts.
    if (!existing) {
      existing = await this.findByEmail(input.email);
    }
    if (existing) {
      const record: User = {
        ...existing,
        id: input.id,
        email: input.email,
        name: input.name,
        role: input.role,
        updatedAt: Date.now(),
        version: existing.version + 1,
      };
      await this.db.update(users).set(record).where(eq(users.id, existing.id));
      await enqueueChange('user', record.id, 'upsert');
      return record;
    }
    const record: User = {
      ...baseRecord(),
      id: input.id,
      email: input.email,
      name: input.name,
      role: input.role,
    };
    await this.db.insert(users).values(record);
    await enqueueChange('user', record.id, 'upsert');
    return record;
  }

  async findById(id: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0];
  }

  async listAll(): Promise<User[]> {
    return this.db.select().from(users).orderBy(asc(users.name));
  }

  async listByRole(role: UserRole): Promise<User[]> {
    return this.db.select().from(users).where(eq(users.role, role)).orderBy(asc(users.name));
  }

  async listWashers(): Promise<User[]> {
    return this.listByRole('washer');
  }
}
