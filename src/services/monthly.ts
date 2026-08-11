import { db } from '@/data/db';
import {
  DayCloseRepository,
  ExpenseRepository,
  JobRepository,
  PaymentRepository,
  UserRepository,
} from '@/data/repositories';
import {
  averageRevenuePerDay,
  monthRangeOf,
  type MonthReport,
} from '@/domain/monthly';
import { dateKey } from '@/domain/day-close';
import type { WasherPerformance } from '@/services/day-close';

const jobRepository = new JobRepository(db);
const paymentRepository = new PaymentRepository(db);
const expenseRepository = new ExpenseRepository(db);
const dayCloseRepository = new DayCloseRepository(db);
const userRepository = new UserRepository(db);

/**
 * Aggregates a calendar month's activity from local data: finished jobs,
 * revenue by payment method (voided payments excluded), voids, expenses, and
 * the number of days that were formally closed. All time bucketing uses the
 * device's local timezone so it matches day-close reporting.
 */
export async function computeMonthlyReport(month: string): Promise<MonthReport> {
  const { from, to } = monthRangeOf(month);
  const [payments, finished, voided, expenses, dayCloses] = await Promise.all([
    paymentRepository.listBetween(from, to),
    jobRepository.listFinishedBetween(from, to),
    jobRepository.listVoidedBetween(from, to),
    expenseRepository.listBetween(from, to),
    dayCloseRepository.list(),
  ]);

  let revenueCents = 0;
  const revenueByMethodCents: Record<string, number> = {};
  for (const payment of payments) {
    if (payment.voidedAt !== null) continue;
    revenueCents += payment.amountCents;
    revenueByMethodCents[payment.method] = (revenueByMethodCents[payment.method] ?? 0) + payment.amountCents;
  }

  const voidedAmountCents = voided.reduce((sum, job) => sum + job.priceCents, 0);
  const expensesCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  const closedDays = dayCloses.filter((close) => close.day.startsWith(`${month}-`));
  const activeDays = new Set<string>();
  for (const payment of payments) activeDays.add(dateKey(payment.paidAt));
  for (const job of finished) activeDays.add(dateKey(job.updatedAt));
  for (const expense of expenses) activeDays.add(dateKey(expense.incurredAt));

  return {
    month,
    jobCount: finished.length,
    revenueCents,
    revenueByMethodCents,
    voidedCount: voided.length,
    voidedAmountCents,
    expensesCents,
    netCents: revenueCents - expensesCents,
    closedDayCount: closedDays.length,
    activeDayCount: activeDays.size,
    avgRevenuePerDayCents: averageRevenuePerDay(revenueCents, activeDays.size),
  };
}

/** Per-washer completed jobs + revenue across a whole month. */
export async function listMonthlyEmployeePerformance(
  month: string,
): Promise<WasherPerformance[]> {
  const { from, to } = monthRangeOf(month);
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
