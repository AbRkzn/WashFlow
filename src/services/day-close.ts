import { db } from '@/data/db';
import {
  DayCloseRepository,
  ExpenseRepository,
  JobRepository,
  PaymentRepository,
  UserRepository,
  type DayClose,
} from '@/data/repositories';
import {
  assertValidDeclaredCash,
  dateKey,
  dayRangeOf,
  varianceCents,
  type DayReport,
} from '@/domain/day-close';
import { logAudit } from '@/services/audit';

const dayCloseRepository = new DayCloseRepository(db);
const jobRepository = new JobRepository(db);
const paymentRepository = new PaymentRepository(db);
const expenseRepository = new ExpenseRepository(db);
const userRepository = new UserRepository(db);

export interface WasherPerformance {
  washerId: string;
  washerName: string | null;
  completedCount: number;
  revenueCents: number;
}

/**
 * Computes a business day's report snapshot from local data. Voided payments
 * are excluded from revenue (their payments carry `voided_at`), and voided
 * jobs are counted separately so the variance is auditable.
 */
export async function computeDayReport(day: string): Promise<DayReport> {
  const { from, to } = dayRangeOf(day);
  const [payments, finished, voided, expenses] = await Promise.all([
    paymentRepository.listBetween(from, to),
    jobRepository.listFinishedBetween(from, to),
    jobRepository.listVoidedBetween(from, to),
    expenseRepository.listBetween(from, to),
  ]);

  const revenueCents = payments
    .filter((payment) => payment.voidedAt === null)
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const voidedAmountCents = voided.reduce((sum, job) => sum + job.priceCents, 0);
  const expensesCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  return {
    day,
    jobCount: finished.length,
    revenueCents,
    voidedCount: voided.length,
    voidedAmountCents,
    expensesCents,
    expectedCashCents: revenueCents,
  };
}

/** Closes today's business day. Idempotent: throws if today is already closed. */
export async function closeDay(
  actorId: string,
  declaredCashCents: number,
  notes?: string,
): Promise<DayClose> {
  const day = dateKey();
  const existing = await dayCloseRepository.findByDay(day);
  if (existing) {
    throw new Error('Today has already been closed. Only an admin can reopen it.');
  }
  const declared = Math.round(declaredCashCents);
  assertValidDeclaredCash(declared);

  const report = await computeDayReport(day);
  const variance = varianceCents(declared, report.expectedCashCents);
  const closed = await dayCloseRepository.create({
    ...report,
    day,
    closedBy: actorId,
    closedAt: Date.now(),
    declaredCashCents: declared,
    varianceCents: variance,
    notes: notes ?? null,
  });

  await logAudit({
    actorId,
    action: 'day-close',
    entity: 'day_close',
    entityId: closed.id,
    details: {
      day,
      jobCount: report.jobCount,
      revenueCents: report.revenueCents,
      expectedCashCents: report.expectedCashCents,
      declaredCashCents: declared,
      varianceCents: variance,
    },
  });
  return closed;
}

/** Reopens a closed day (Admin only). Soft-deletes the close so it tombstones. */
export async function reopenDay(day: string, actorId: string): Promise<void> {
  const existing = await dayCloseRepository.findByDay(day);
  if (!existing) {
    throw new Error('That day has not been closed.');
  }
  await dayCloseRepository.softDelete(existing.id);
  await logAudit({
    actorId,
    action: 'day-reopen',
    entity: 'day_close',
    entityId: existing.id,
    details: { day },
  });
}

export async function listDayCloses(): Promise<DayClose[]> {
  return dayCloseRepository.list();
}

export async function getDayClose(day: string): Promise<DayClose | null> {
  return (await dayCloseRepository.findByDay(day)) ?? null;
}

/** Per-washer completed jobs + revenue for a day (employee performance). */
export async function listEmployeePerformance(day: string): Promise<WasherPerformance[]> {
  const { from, to } = dayRangeOf(day);
  const [finished, users] = await Promise.all([
    jobRepository.listFinishedBetween(from, to),
    userRepository.listAll(),
  ]);
  const nameById = new Map(users.map((user) => [user.id, user.name]));
  const byWasher = new Map<string, WasherPerformance>();
  for (const job of finished) {
    if (!job.assignedTo) continue;
    const current = byWasher.get(job.assignedTo) ?? {
      washerId: job.assignedTo,
      washerName: nameById.get(job.assignedTo) ?? null,
      completedCount: 0,
      revenueCents: 0,
    };
    current.completedCount += 1;
    current.revenueCents += job.priceCents;
    byWasher.set(job.assignedTo, current);
  }
  return Array.from(byWasher.values()).sort((a, b) => b.completedCount - a.completedCount);
}
