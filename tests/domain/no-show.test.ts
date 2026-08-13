import { describe, expect, it } from 'vitest';

import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from '@/domain/appointment';

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

describe('appointment no-show status', () => {
  it('includes no-show in the status set', () => {
    expect(APPOINTMENT_STATUSES).toContain('no-show');
  });

  it('labels no-show', () => {
    expect(APPOINTMENT_STATUS_LABELS['no-show']).toBe('No-show');
  });

  it('recognises no-show as a valid status', () => {
    expect(isAppointmentStatus('no-show')).toBe(true);
    expect(isAppointmentStatus('booked')).toBe(true);
    expect(isAppointmentStatus('unknown')).toBe(false);
  });
});
