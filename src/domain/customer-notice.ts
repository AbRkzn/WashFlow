export const CUSTOMER_NOTICE_MILESTONES = ['queued', 'ready', 'paid'] as const;

export type CustomerNoticeMilestone = (typeof CUSTOMER_NOTICE_MILESTONES)[number];

export interface CustomerNoticeInput {
  milestone: CustomerNoticeMilestone;
  plateNumber: string;
  customerName: string;
  serviceName: string | null;
  businessName?: string;
}

const BUSINESS_NAME = 'WashFlow';

/** Shareable status text a cashier can send a customer (SMS/messenger). */
export function buildCustomerNotice(input: CustomerNoticeInput): string {
  const business = input.businessName?.trim() || BUSINESS_NAME;
  const service = input.serviceName ? ` (${input.serviceName})` : '';
  switch (input.milestone) {
    case 'queued':
      return (
        `${business} — ${input.customerName}, your vehicle ${input.plateNumber} has been ` +
        `checked in${service} and is in the queue.`
      );
    case 'ready':
      return (
        `${business} — ${input.customerName}, your vehicle ${input.plateNumber} is ready ` +
        `for pickup${service}. We look forward to seeing you!`
      );
    case 'paid':
      return (
        `${business} — ${input.customerName}, payment for ${input.plateNumber} has been ` +
        `received${service}. Thank you!`
      );
  }
}
