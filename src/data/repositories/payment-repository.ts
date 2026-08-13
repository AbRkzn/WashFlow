import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { payments, type Payment } from '@/data/schema';
import type { PaymentMethod } from '@/domain/payment';
import { enqueueChange } from '@/sync/outbox';

export interface NewPayment {
  jobId: string;
  amountCents: number;
  method?: PaymentMethod;
  receivedBy?: string | null;
  paidAt?: number;
}

export class PaymentRepository {
  constructor(private readonly db: Database) {}

  async add(input: NewPayment & { id?: string }): Promise<Payment> {
    const base = baseRecord();
    const record: Payment = {
      ...base,
      id: input.id ?? base.id,
      jobId: input.jobId,
      amountCents: input.amountCents,
      method: input.method ?? 'cash',
      receivedBy: input.receivedBy ?? null,
      paidAt: input.paidAt ?? Date.now(),
      voidedAt: null,
    };
    await this.db.insert(payments).values(record);
    await enqueueChange('payment', record.id, 'upsert');
    return record;
  }

  async findForJob(jobId: string): Promise<Payment | undefined> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(eq(payments.jobId, jobId))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<Payment | undefined> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return rows[0];
  }

  async markVoided(id: string, at: number = Date.now()): Promise<boolean> {
    const rows = await this.db
      .update(payments)
      .set({ voidedAt: at, updatedAt: Date.now(), version: sql`${payments.version} + 1` })
      .where(eq(payments.id, id))
      .returning({ id: payments.id });
    if (rows.length > 0) {
      await enqueueChange('payment', id, 'upsert');
    }
    return rows.length > 0;
  }

  /** Payments recorded within a time window (voided payments stay in the row, flagged). */
  async listBetween(from: number, to: number): Promise<Payment[]> {
    return this.db
      .select()
      .from(payments)
      .where(and(sql`${payments.paidAt} >= ${from}`, sql`${payments.paidAt} <= ${to}`, isNull(payments.deletedAt)))
      .orderBy(sql`${payments.paidAt} asc`);
  }
}
