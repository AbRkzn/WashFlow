export const SETTING_KEYS = {
  businessOpenMinutes: 'business_open_minutes',
  businessCloseMinutes: 'business_close_minutes',
  slotMinutes: 'appointment_slot_minutes',
} as const;

export const DEFAULT_SCHEDULE = {
  openMinutes: 8 * 60,
  closeMinutes: 20 * 60,
  slotMinutes: 30,
} as const;

export interface Schedule {
  openMinutes: number;
  closeMinutes: number;
  slotMinutes: number;
}
