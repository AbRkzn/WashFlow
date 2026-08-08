import { and, asc, eq, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import {
  customers,
  jobs,
  services,
  vehicles,
  voidRequests,
  type Customer,
  type Job,
  type Service,
  type Vehicle,
  type VoidRequest,
} from '@/data/schema';
import type { VoidRequestStatus } from '@/domain/payment';
import { enqueueChange } from '@/sync/outbox';

export interface NewVoidRequest {
  jobId: string;
  requestedBy: string;
  reason?: string | null;
  status?: VoidRequestStatus;
  resolvedBy?: string | null;
  resolvedAt?: number | null;
}

export interface VoidRequestEntry {
  request: VoidRequest;
  job: Job;
  vehicle: Vehicle;
  customer: Customer;
  service: Service | null;
}

const VOID_REQUEST_SELECT = {
  request: voidRequests,
  job: jobs,
  vehicle: vehicles,
  customer: customers,
  service: services,
} as const;

export class VoidRequestRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewVoidRequest): Promise<VoidRequest> {
    const record: VoidRequest = {
      ...baseRecord(),
      jobId: input.jobId,
      requestedBy: input.requestedBy,
      reason: input.reason ?? null,
      status: input.status ?? 'pending',
      resolvedBy: input.resolvedBy ?? null,
      resolvedAt: input.resolvedAt ?? null,
    };
    await this.db.insert(voidRequests).values(record);
    await enqueueChange('void_request', record.id, 'upsert');
    return record;
  }

  async findById(id: string): Promise<VoidRequest | undefined> {
    const rows = await this.db
      .select()
      .from(voidRequests)
      .where(eq(voidRequests.id, id))
      .limit(1);
    return rows[0];
  }

  async listPendingWithDetails(): Promise<VoidRequestEntry[]> {
    return this.db
      .select(VOID_REQUEST_SELECT)
      .from(voidRequests)
      .innerJoin(jobs, eq(voidRequests.jobId, jobs.id))
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(eq(voidRequests.status, 'pending'))
      .orderBy(asc(voidRequests.createdAt));
  }

  async resolve(
    id: string,
    status: Extract<VoidRequestStatus, 'approved' | 'rejected'>,
    resolvedBy: string,
    resolvedAt: number = Date.now(),
  ): Promise<boolean> {
    const rows = await this.db
      .update(voidRequests)
      .set({ status, resolvedBy, resolvedAt, updatedAt: Date.now(), version: sql`${voidRequests.version} + 1` })
      .where(and(eq(voidRequests.id, id), eq(voidRequests.status, 'pending')))
      .returning({ id: voidRequests.id });
    if (rows.length > 0) {
      await enqueueChange('void_request', id, 'upsert');
    }
    return rows.length > 0;
  }
}
