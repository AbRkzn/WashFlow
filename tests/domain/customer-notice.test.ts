import { describe, expect, it } from 'vitest';

import {
  buildCustomerNotice,
  CUSTOMER_NOTICE_MILESTONES,
} from '@/domain/customer-notice';

const input = {
  plateNumber: 'ABC-1234',
  customerName: 'Juan',
  serviceName: 'Express',
};

describe('customer notice domain', () => {
  it('covers the supported milestones', () => {
    expect(CUSTOMER_NOTICE_MILESTONES).toEqual(['queued', 'ready', 'paid']);
  });

  it('builds a queued message', () => {
    const text = buildCustomerNotice({ ...input, milestone: 'queued' });
    expect(text).toContain('ABC-1234');
    expect(text).toContain('checked in');
    expect(text).toContain('queue');
  });

  it('builds a ready-for-pickup message', () => {
    const text = buildCustomerNotice({ ...input, milestone: 'ready' });
    expect(text).toContain('ABC-1234');
    expect(text).toContain('ready for pickup');
  });

  it('builds a paid message', () => {
    const text = buildCustomerNotice({ ...input, milestone: 'paid' });
    expect(text).toContain('payment for ABC-1234');
    expect(text).toContain('received');
  });

  it('includes the service name when present and omits it otherwise', () => {
    const withService = buildCustomerNotice({ ...input, milestone: 'ready' });
    expect(withService).toContain('Express');

    const without = buildCustomerNotice({ ...input, milestone: 'ready', serviceName: null });
    expect(without).not.toContain('Express');
  });

  it('uses the WashFlow brand by default and honors a custom business name', () => {
    expect(buildCustomerNotice({ ...input, milestone: 'paid' })).toContain('WashFlow');
    expect(
      buildCustomerNotice({ ...input, milestone: 'paid', businessName: 'My Wash' }),
    ).toContain('My Wash');
  });

  it('produces a non-empty message for every milestone', () => {
    for (const milestone of [...CUSTOMER_NOTICE_MILESTONES]) {
      expect(buildCustomerNotice({ ...input, milestone }).length).toBeGreaterThan(0);
    }
  });
});
