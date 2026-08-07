import { asc, eq } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { users, type User } from '@/data/schema';
import type { UserRole } from '@/domain/user';

export interface UpsertUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export class UserRepository {
  constructor(private readonly db: Database) {}

  async upsert(input: UpsertUser): Promise<User> {
    const existing = await this.findById(input.id);
    if (existing) {
      const record: User = {
        ...existing,
        email: input.email,
        name: input.name,
        role: input.role,
        updatedAt: Date.now(),
        version: existing.version + 1,
      };
      await this.db.update(users).set(record).where(eq(users.id, existing.id));
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
    return record;
  }

  async findById(id: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
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
