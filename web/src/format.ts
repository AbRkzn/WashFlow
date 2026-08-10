export function formatPesos(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}₱${(abs / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatClockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(epochMs: number): string {
  return `${formatDate(epochMs)} · ${formatClockTime(epochMs)}`;
}

export function dayKeyOf(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dayKeyOf(Date.now());
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  assigned: 'Assigned',
  in_progress: 'In progress',
  quality_check: 'Quality check',
  completed: 'Completed',
  paid: 'Paid',
  voided: 'Voided',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  card: 'Card',
};
