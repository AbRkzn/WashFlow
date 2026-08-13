export const SETTING_KEYS = {
  businessOpenMinutes: 'business_open_minutes',
  businessCloseMinutes: 'business_close_minutes',
  slotMinutes: 'appointment_slot_minutes',
  washerShowPrices: 'washer_show_prices',
} as const;

export const DEFAULT_SCHEDULE = {
  openMinutes: 8 * 60,
  closeMinutes: 20 * 60,
  slotMinutes: 30,
} as const;

/** Washers see service prices only when an admin enables this setting. */
export const DEFAULT_WASHER_SHOW_PRICES = false;

export interface Schedule {
  openMinutes: number;
  closeMinutes: number;
  slotMinutes: number;
}
