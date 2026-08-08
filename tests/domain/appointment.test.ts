import { describe, expect, it } from 'vitest';

import {
  APPOINTMENT_STATUSES,
  MIN_SLOT_MINUTES,
  alignToSlot,
  dateKeyToStartOfDay,
  formatSlotTime,
  generateSlotStarts,
  toDateKey,
} from '@/domain/appointment';

describe('appointment domain', () => {
  it('aligns timestamps down to the slot boundary', () => {
    const base = new Date(2026, 7, 8, 10, 0, 0).getTime();
    expect(alignToSlot(base + 7 * 60 * 1000, 30)).toBe(base);
    expect(alignToSlot(base + 31 * 60 * 1000, 30)).toBe(base + 30 * 60 * 1000);
  });

  it('converts to and from date keys', () => {
    const ts = new Date(2026, 7, 8, 14, 30).getTime();
    expect(toDateKey(ts)).toBe('2026-08-08');
    expect(dateKeyToStartOfDay('2026-08-08')).toBe(new Date(2026, 7, 8).getTime());
  });

  it('generates slots from open to close', () => {
    const starts = generateSlotStarts('2026-08-08', 8 * 60, 20 * 60, 30);
    expect(starts).toHaveLength(24);
    expect(new Date(starts[0]).getHours()).toBe(8);
    expect(new Date(starts[starts.length - 1]).getHours()).toBe(19);
    expect(new Date(starts[starts.length - 1]).getMinutes()).toBe(30);
  });

  it('formats slot times in 12-hour notation', () => {
    expect(formatSlotTime(new Date(2026, 7, 8, 8, 0).getTime())).toBe('8 AM');
    expect(formatSlotTime(new Date(2026, 7, 8, 8, 30).getTime())).toBe('8:30 AM');
    expect(formatSlotTime(new Date(2026, 7, 8, 12, 0).getTime())).toBe('12 PM');
    expect(formatSlotTime(new Date(2026, 7, 8, 15, 30).getTime())).toBe('3:30 PM');
  });

  it('keeps the slot length and status set stable', () => {
    expect(MIN_SLOT_MINUTES).toBe(30);
    expect(APPOINTMENT_STATUSES).toEqual(['booked', 'cancelled', 'completed']);
  });
});
