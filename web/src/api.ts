import { supabase } from './supabase';
import type {
  AppointmentRow,
  CustomerRow,
  DayCloseRow,
  ExpenseRow,
  InventoryRow,
  JobRow,
  PaymentRow,
  ServiceRow,
  SyncSnapshotEntry,
  UserRow,
  VehicleRow,
} from './types';

export interface DashboardData {
  customers: CustomerRow[];
  vehicles: VehicleRow[];
  services: ServiceRow[];
  jobs: JobRow[];
  payments: PaymentRow[];
  users: UserRow[];
  dayCloses: DayCloseRow[];
  appointments: AppointmentRow[];
  expenses: ExpenseRow[];
  inventory: InventoryRow[];
  fetchedAt: number;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('dashboard_snapshot', { p_after_seq: 0 });
  if (error) {
    throw new Error(error.message);
  }
  const entries = (data ?? []) as SyncSnapshotEntry[];

  const byEntity = new Map<string, Record<string, unknown>[]>();
  for (const entry of entries) {
    const bucket = byEntity.get(entry.entity) ?? [];
    bucket.push(entry.row);
    byEntity.set(entry.entity, bucket);
  }

  const alive = <T>(rows: unknown[]): T[] =>
    rows.filter((r) => (r as { deleted_at: unknown }).deleted_at === null) as T[];

  return {
    customers: alive<CustomerRow>(byEntity.get('customer') ?? []),
    vehicles: alive<VehicleRow>(byEntity.get('vehicle') ?? []),
    services: alive<ServiceRow>(byEntity.get('service') ?? []),
    jobs: alive<JobRow>(byEntity.get('job') ?? []),
    payments: alive<PaymentRow>(byEntity.get('payment') ?? []),
    users: alive<UserRow>(byEntity.get('user') ?? []),
    dayCloses: alive<DayCloseRow>(byEntity.get('day_close') ?? []),
    appointments: alive<AppointmentRow>(byEntity.get('appointment') ?? []),
    expenses: alive<ExpenseRow>(byEntity.get('expense') ?? []),
    inventory: alive<InventoryRow>(byEntity.get('inventory_item') ?? []),
    fetchedAt: Date.now(),
  };
}
