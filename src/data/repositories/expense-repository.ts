import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { expenses, type Expense } from '@/data/schema';
import { isExpenseCategory, type ExpenseCategory } from '@/domain/expense';

export interface NewExpense {
  amountCents: number;
  category?: ExpenseCategory;
  description?: string | null;
  incurredAt?: number;
  loggedBy?: string | null;
}

export class ExpenseRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewExpense): Promise<Expense> {
    const record: Expense = {
      ...baseRecord(),
      amountCents: input.amountCents,
      category: input.category && isExpenseCategory(input.category) ? input.category : 'other',
      description: input.description ?? null,
      incurredAt: input.incurredAt ?? Date.now(),
      loggedBy: input.loggedBy ?? null,
    };
    await this.db.insert(expenses).values(record);
    return record;
  }

  async findById(id: string): Promise<Expense | undefined> {
    const rows = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async listBetween(from: number, to: number): Promise<Expense[]> {
    return this.db
      .select()
      .from(expenses)
      .where(
        and(
          isNull(expenses.deletedAt),
          gte(expenses.incurredAt, from),
          lte(expenses.incurredAt, to),
        ),
      )
      .orderBy(asc(expenses.incurredAt));
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(expenses)
      .set({ deletedAt: Date.now(), updatedAt: Date.now(), version: sql`${expenses.version} + 1` })
      .where(eq(expenses.id, id));
  }
}
