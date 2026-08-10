import { describe, expect, it } from 'vitest';

import {
  buildReceiptNumber,
  formatPesosForReceipt,
  formatReceiptIssuedAt,
  receiptLineItems,
  receiptText,
  type Receipt,
} from '@/domain/receipt';

const sampleReceipt: Receipt = {
  receiptNumber: 'WF-20260810-ABCDE',
  issuedAt: new Date(2026, 7, 10, 14, 30).getTime(),
  plateNumber: 'ABC-1234',
  customerName: 'Juan Dela Cruz',
  serviceName: 'Express',
  amountCents: 35000,
  method: 'cash',
  receivedByName: 'Maria',
  jobId: 'job-1',
  paymentId: 'pay-1',
};

describe('receipt number', () => {
  it('builds a stable WF-<date>-<tail> number from the payment id', () => {
    expect(buildReceiptNumber('0190f0a1-2b3c-4d5e-8f9a-0b1c2d3e4f50', new Date(2026, 7, 10).getTime())).toBe(
      'WF-20260810-E4F50',
    );
  });

  it('pads month and day to two digits', () => {
    expect(buildReceiptNumber('abc', new Date(2026, 0, 5).getTime())).toBe('WF-20260105-ABC');
  });
});

describe('pesos formatting', () => {
  it('formats cents with two decimals and thousands separators', () => {
    expect(formatPesosForReceipt(35000)).toBe('₱350.00');
    expect(formatPesosForReceipt(1234567)).toBe('₱12,345.67');
    expect(formatPesosForReceipt(0)).toBe('₱0.00');
    expect(formatPesosForReceipt(-500)).toBe('-₱5.00');
  });
});

describe('receipt line items', () => {
  it('lists the expected fields in order', () => {
    const items = receiptLineItems(sampleReceipt);
    expect(items.map((item) => item.label)).toEqual([
      'Receipt no.',
      'Date',
      'Plate number',
      'Customer',
      'Service',
      'Payment',
      'Amount',
    ]);
    expect(items[0].value).toBe('WF-20260810-ABCDE');
    expect(items[6].value).toBe('₱350.00');
  });

  it('formats the issued date for display', () => {
    expect(formatReceiptIssuedAt(sampleReceipt.issuedAt)).toMatch(/2026/);
    expect(formatReceiptIssuedAt(sampleReceipt.issuedAt)).toMatch(/Aug/);
  });
});

describe('receipt text', () => {
  it('includes the header, details, collector, and closing', () => {
    const text = receiptText(sampleReceipt);
    expect(text).toContain('WASHFLOW');
    expect(text).toContain('Plate number: ABC-1234');
    expect(text).toContain('Service: Express');
    expect(text).toContain('Amount: ₱350.00');
    expect(text).toContain('Collected by: Maria');
    expect(text).toContain('Thank you!');
  });

  it('handles a missing collector name', () => {
    const text = receiptText({ ...sampleReceipt, receivedByName: null });
    expect(text).toContain('Collected by: —');
  });
});
