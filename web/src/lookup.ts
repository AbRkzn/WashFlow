import type {
  CustomerRow,
  JobRow,
  PaymentRow,
  ServiceRow,
  UserRow,
  VehicleRow,
} from './types';
import type { DashboardData } from './api';

export type { DashboardData };

export function vehicleById(data: DashboardData, id: string | null): VehicleRow | undefined {
  return id ? data.vehicles.find((v) => v.id === id) : undefined;
}

export function customerById(data: DashboardData, id: string | null): CustomerRow | undefined {
  return id ? data.customers.find((c) => c.id === id) : undefined;
}

export function serviceById(data: DashboardData, id: string | null): ServiceRow | undefined {
  return id ? data.services.find((s) => s.id === id) : undefined;
}

export function userById(data: DashboardData, id: string | null): UserRow | undefined {
  return id ? data.users.find((u) => u.id === id) : undefined;
}

export function jobById(data: DashboardData, id: string | null): JobRow | undefined {
  return id ? data.jobs.find((j) => j.id === id) : undefined;
}

export function paymentById(data: DashboardData, id: string | null): PaymentRow | undefined {
  return id ? data.payments.find((p) => p.id === id) : undefined;
}

export function plateOf(data: DashboardData, job: JobRow): string {
  return vehicleById(data, job.vehicle_id)?.plate_number ?? '—';
}

export function serviceNameOf(data: DashboardData, job: JobRow): string {
  return serviceById(data, job.service_id)?.name ?? '—';
}
