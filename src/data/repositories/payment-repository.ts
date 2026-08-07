import { eq, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { payments, type Payment } from '@/data/schema';
import type { PaymentMethod } from '@/domain/payment';

export interface NewPayment {
  jobId: string;
  amountCents: number;
  method?: PaymentMethod;
  receivedBy?: string | null;
  paidAt?: number;
}

export class PaymentRepository {
  constructor(private readonly db: Database) {}

  async add(input: NewPayment): Promise<Payment> {
    const record: Payment = {
      ...baseRecord(),
      jobId: input.jobId,
      amountCents: input.amountCents,
      method: input.method ?? 'cash',
      receivedBy: input.receivedBy ?? null,
      paidAt: input.paidAt ?? Date.now(),
      voidedAt: null,
    };
    await this.db.insert(payments).values(record);
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

  async markVoided(id: string, at: number = Date.now()): Promise<boolean> {
    const rows = await this.db
      .update(payments)
      .set({ voidedAt: at, updatedAt: Date.now(), version: sql`${payments.version} + 1` })
      .where(eq(payments.id, id))
      .returning({ id: payments.id });
    return rows.length > 0;
  }
}
