import type { PaymentMethod } from './payment';
import { PAYMENT_METHOD_LABELS } from './payment';

export interface ReceiptLineItem {
  label: string;
  value: string;
}

/** Immutable receipt payload built from a settled payment + its job details. */
export interface Receipt {
  receiptNumber: string;
  issuedAt: number;
  plateNumber: string;
  customerName: string;
  serviceName: string;
  amountCents: number;
  method: PaymentMethod;
  receivedByName: string | null;
  jobId: string;
  paymentId: string;
}

/** Stable, human-readable receipt number: WF-<date>-<last 5 of payment id> uppercased. */
export function buildReceiptNumber(paymentId: string, issuedAt: number): string {
  const date = new Date(issuedAt);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const tail = paymentId.replace(/-/g, '').slice(-5).toUpperCase();
  return `WF-${y}${m}${d}-${tail}`;
}

export function formatPesosForReceipt(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const pesos = (abs / 100).toFixed(2);
  return `${sign}₱${pesos.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatReceiptIssuedAt(epochMs: number): string {
  return new Date(epochMs).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Lines rendered in the on-screen receipt modal. */
export function receiptLineItems(receipt: Receipt): ReceiptLineItem[] {
  return [
    { label: 'Receipt no.', value: receipt.receiptNumber },
    { label: 'Date', value: formatReceiptIssuedAt(receipt.issuedAt) },
    { label: 'Plate number', value: receipt.plateNumber },
    { label: 'Customer', value: receipt.customerName },
    { label: 'Service', value: receipt.serviceName },
    { label: 'Payment', value: PAYMENT_METHOD_LABELS[receipt.method] },
    {
      label: 'Amount',
      value: formatPesosForReceipt(receipt.amountCents),
    },
  ];
}

/** Plain-text receipt for sharing/messaging. */
export function receiptText(receipt: Receipt): string {
  const lines = [
    'WASHFLOW',
    'Official Receipt',
    '──────────────',
    ...receiptLineItems(receipt).map((item) => `${item.label}: ${item.value}`),
    '──────────────',
    `Collected by: ${receipt.receivedByName ?? '—'}`,
    `Job ID: ${receipt.jobId}`,
    '',
    'Thank you!',
  ];
  return lines.join('\n');
}
