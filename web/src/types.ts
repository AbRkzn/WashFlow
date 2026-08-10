// Mirror row shapes (snake_case column parity with the local Drizzle schema).
// Remote rows are JSONB in sync_mirror; timestamps are epoch-millis integers.

export interface MirrorRow {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface CustomerRow extends MirrorRow {
  name: string;
  phone: string | null;
  notes: string | null;
}

export interface VehicleRow extends MirrorRow {
  customer_id: string | null;
  plate_number: string;
  make: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
}

export interface ServiceRow extends MirrorRow {
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
}

export type JobStatus =
  | 'queued'
  | 'assigned'
  | 'in_progress'
  | 'quality_check'
  | 'completed'
  | 'paid'
  | 'voided';

export interface JobRow extends MirrorRow {
  customer_id: string | null;
  vehicle_id: string | null;
  service_id: string | null;
  status: JobStatus;
  price_cents: number;
  assigned_to: string | null;
  notes: string | null;
}

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'card';

export interface PaymentRow extends MirrorRow {
  job_id: string | null;
  amount_cents: number;
  method: PaymentMethod;
  received_by: string | null;
  paid_at: number;
  voided_at: number | null;
}

export interface UserRow extends MirrorRow {
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier' | 'washer';
}

export interface DayCloseRow extends MirrorRow {
  day: string;
  closed_by: string | null;
  closed_at: number;
  job_count: number;
  revenue_cents: number;
  revenue_by_method_cents: string;
  voided_count: number;
  voided_amount_cents: number;
  expenses_cents: number;
  expected_cash_cents: number;
  declared_cash_cents: number;
  variance_cents: number;
  notes: string | null;
}

export interface AppointmentRow extends MirrorRow {
  vehicle_id: string | null;
  customer_id: string | null;
  service_id: string | null;
  job_id: string | null;
  date: string;
  slot_start: number;
  duration_minutes: number;
  status: 'booked' | 'completed' | 'cancelled';
  rescheduled: boolean;
  notes: string | null;
}

export interface ExpenseRow extends MirrorRow {
  amount_cents: number;
  category: string;
  description: string | null;
  incurred_at: number;
  logged_by: string | null;
}

export interface InventoryRow extends MirrorRow {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number | null;
  notes: string | null;
}

export interface SyncSnapshotEntry {
  entity: string;
  entity_id: string;
  row: Record<string, unknown>;
  server_seq: number;
}
