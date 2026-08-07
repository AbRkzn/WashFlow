export const APPOINTMENT_STATUSES = ['booked', 'cancelled', 'completed'] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: 'Booked',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const MIN_SLOT_MINUTES = 30;

export function alignToSlot(ts: number, slotMinutes: number): number {
  const windowMs = slotMinutes * 60 * 1000;
  return Math.floor(ts / windowMs) * windowMs;
}

export function toDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateKeyToStartOfDay(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

export function generateSlotStarts(
  date: string,
  openMinutes: number,
  closeMinutes: number,
  slotMinutes: number,
): number[] {
  const dayStart = dateKeyToStartOfDay(date);
  const starts: number[] = [];
  for (let m = openMinutes; m < closeMinutes; m += slotMinutes) {
    starts.push(dayStart + m * 60 * 1000);
  }
  return starts;
}

export function formatSlotTime(ts: number): string {
  const d = new Date(ts);
  const hour = d.getHours();
  const minute = d.getMinutes();
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`;
  return `${displayHour}${displayMinute} ${period}`;
}
