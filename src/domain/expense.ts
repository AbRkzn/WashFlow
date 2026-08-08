export const EXPENSE_CATEGORIES = [
  'supplies',
  'utilities',
  'rent',
  'maintenance',
  'labor',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  supplies: 'Supplies',
  utilities: 'Utilities',
  rent: 'Rent',
  maintenance: 'Maintenance',
  labor: 'Labor',
  other: 'Other',
};

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}
