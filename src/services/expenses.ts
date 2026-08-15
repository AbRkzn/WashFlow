import { db } from '@/data/db';
import { ExpenseRepository, type NewExpense } from '@/data/repositories';
import { logAudit } from '@/services/audit';

const expenseRepository = new ExpenseRepository(db);

export function dayRange(timestamp: number = Date.now()): { from: number; to: number } {
  const date = new Date(timestamp);
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const to = from + 24 * 60 * 60 * 1000 - 1;
  return { from, to };
}

export async function logExpense(input: NewExpense, actorId: string): Promise<void> {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }
  const expense = await expenseRepository.create({ ...input, loggedBy: actorId });
  await logAudit({
    actorId,
    action: 'expense-logged',
    entity: 'expense',
    entityId: expense.id,
    details: { amountCents: expense.amountCents, category: expense.category },
  });
}

export async function listDayExpenses(timestamp: number = Date.now()) {
  const { from, to } = dayRange(timestamp);
  return expenseRepository.listBetween(from, to);
}

export async function listRecentExpenses(limit = 200) {
  return expenseRepository.listRecent(limit);
}

export async function deleteExpense(expenseId: string, actorId: string): Promise<void> {
  const expense = await expenseRepository.findById(expenseId);
  if (!expense) {
    throw new Error('Expense not found.');
  }
  await expenseRepository.softDelete(expenseId);
  await logAudit({
    actorId,
    action: 'expense-deleted',
    entity: 'expense',
    entityId: expenseId,
    details: { amountCents: expense.amountCents, category: expense.category },
  });
}

export async function sumExpenses(expenses: { amountCents: number }[]): Promise<number> {
  return expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
}
