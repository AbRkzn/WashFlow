import type { JobStatus } from './job';

export const PAYMENT_METHODS = ['cash', 'gcash', 'maya', 'card'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  card: 'Card',
};

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cash';

export const VOID_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type VoidRequestStatus = (typeof VOID_REQUEST_STATUSES)[number];

export const VOID_REQUEST_STATUS_LABELS: Record<VoidRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function canCashierVoid(jobStatus: JobStatus): boolean {
  return jobStatus === 'queued';
}

export function assertCanCashierVoid(jobStatus: JobStatus): void {
  if (!canCashierVoid(jobStatus)) {
    throw new Error('Only a job still unclaimed in the queue can be voided without manager approval.');
  }
}
