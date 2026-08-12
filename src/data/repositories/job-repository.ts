import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { customers, jobs, payments, services, vehicles, type Customer, type Job, type Payment, type Service, type Vehicle } from '@/data/schema';
import { type JobStatus, ACTIVE_STATUSES, WORKING_STATUSES } from '@/domain/job';
import { normalizePlate } from '@/data/repositories/vehicle-repository';
import { enqueueChange } from '@/sync/outbox';

export interface NewJob {
  customerId: string;
  vehicleId: string;
  serviceId: string;
  status?: JobStatus;
  priceCents: number;
  assignedTo?: string | null;
  notes?: string | null;
}

export interface QueueEntry {
  job: Job;
  vehicle: Vehicle;
  customer: Customer;
  service: Service | null;
}

export interface PaymentHistoryEntry {
  job: Job;
  vehicle: Vehicle;
  customer: Customer;
  service: Service | null;
  payment: Payment;
}

export interface VehicleHistoryEntry {
  job: Job;
  vehicle: Vehicle;
  customer: Customer;
  service: Service | null;
  payment: Payment | null;
}

const JOB_SELECT = {
  job: jobs,
  vehicle: vehicles,
  customer: customers,
  service: services,
} as const;

export class JobRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewJob): Promise<Job> {
    const record: Job = {
      ...baseRecord(),
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      serviceId: input.serviceId,
      status: input.status ?? 'queued',
      priceCents: input.priceCents,
      assignedTo: input.assignedTo ?? null,
      notes: input.notes ?? null,
    };
    await this.db.insert(jobs).values(record);
    await enqueueChange('job', record.id, 'upsert');
    return record;
  }

  async findById(id: string): Promise<Job | undefined> {
    const rows = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), isNull(jobs.deletedAt)))
      .limit(1);
    return rows[0];
  }

  /** Counts live (non-deleted) jobs per service id, for duplicate-service cleanup. */
  async listServiceReferenceCounts(): Promise<Map<string | null, number>> {
    const rows = await this.db
      .select({ serviceId: jobs.serviceId, count: sql<number>`count(*)` })
      .from(jobs)
      .where(isNull(jobs.deletedAt))
      .groupBy(jobs.serviceId);
    return new Map(rows.map((row) => [row.serviceId, row.count]));
  }

  async findByIdWithDetails(id: string): Promise<QueueEntry | undefined> {
    const rows = await this.db
      .select(JOB_SELECT)
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(and(eq(jobs.id, id), isNull(jobs.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async listByStatus(status: JobStatus): Promise<Job[]> {
    return this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, status), isNull(jobs.deletedAt)))
      .orderBy(asc(jobs.createdAt));
  }

  async setStatus(id: string, status: JobStatus): Promise<boolean> {
    const rows = await this.db
      .update(jobs)
      .set({ status, updatedAt: Date.now(), version: sql`${jobs.version} + 1` })
      .where(and(eq(jobs.id, id), isNull(jobs.deletedAt)))
      .returning({ id: jobs.id });
    if (rows.length > 0) {
      await enqueueChange('job', id, 'upsert');
    }
    return rows.length > 0;
  }

  async transition(id: string, from: JobStatus[], to: JobStatus): Promise<boolean> {
    const rows = await this.db
      .update(jobs)
      .set({ status: to, updatedAt: Date.now(), version: sql`${jobs.version} + 1` })
      .where(and(eq(jobs.id, id), inArray(jobs.status, from), isNull(jobs.deletedAt)))
      .returning({ id: jobs.id });
    if (rows.length > 0) {
      await enqueueChange('job', id, 'upsert');
    }
    return rows.length > 0;
  }

  async claim(id: string, washerId: string): Promise<boolean> {
    const rows = await this.db
      .update(jobs)
      .set({
        status: 'assigned',
        assignedTo: washerId,
        updatedAt: Date.now(),
        version: sql`${jobs.version} + 1`,
      })
      .where(
        and(
          eq(jobs.id, id),
          eq(jobs.status, 'queued'),
          isNull(jobs.assignedTo),
          isNull(jobs.deletedAt),
        ),
      )
      .returning({ id: jobs.id });
    if (rows.length > 0) {
      await enqueueChange('job', id, 'upsert');
    }
    return rows.length > 0;
  }

  async assignTo(id: string, washerId: string): Promise<boolean> {
    const rows = await this.db
      .update(jobs)
      .set({
        status: 'assigned',
        assignedTo: washerId,
        updatedAt: Date.now(),
        version: sql`${jobs.version} + 1`,
      })
      .where(
        and(
          eq(jobs.id, id),
          eq(jobs.status, 'queued'),
          isNull(jobs.deletedAt),
        ),
      )
      .returning({ id: jobs.id });
    if (rows.length > 0) {
      await enqueueChange('job', id, 'upsert');
    }
    return rows.length > 0;
  }

  async reassign(id: string, washerId: string): Promise<boolean> {
    const rows = await this.db
      .update(jobs)
      .set({
        assignedTo: washerId,
        updatedAt: Date.now(),
        version: sql`${jobs.version} + 1`,
      })
      .where(
        and(
          eq(jobs.id, id),
          inArray(jobs.status, ['assigned', 'in_progress', 'quality_check']),
          isNull(jobs.deletedAt),
        ),
      )
      .returning({ id: jobs.id });
    if (rows.length > 0) {
      await enqueueChange('job', id, 'upsert');
    }
    return rows.length > 0;
  }

  async release(id: string): Promise<boolean> {
    const rows = await this.db
      .update(jobs)
      .set({
        status: 'queued',
        assignedTo: null,
        updatedAt: Date.now(),
        version: sql`${jobs.version} + 1`,
      })
      .where(
        and(
          eq(jobs.id, id),
          inArray(jobs.status, ['assigned', 'in_progress']),
          isNull(jobs.deletedAt),
        ),
      )
      .returning({ id: jobs.id });
    if (rows.length > 0) {
      await enqueueChange('job', id, 'upsert');
    }
    return rows.length > 0;
  }

  async listQueuedWithDetails(): Promise<QueueEntry[]> {
    return this.db
      .select(JOB_SELECT)
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(and(eq(jobs.status, 'queued'), isNull(jobs.deletedAt)))
      .orderBy(asc(jobs.createdAt));
  }

  async listCompletedWithDetails(): Promise<QueueEntry[]> {
    return this.db
      .select(JOB_SELECT)
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(and(eq(jobs.status, 'completed'), isNull(jobs.deletedAt)))
      .orderBy(asc(jobs.createdAt));
  }

  /** Jobs finished (completed or paid) within a time window — for day reports. */
  async listFinishedBetween(from: number, to: number): Promise<Job[]> {
    return this.db
      .select()
      .from(jobs)
      .where(
        and(
          inArray(jobs.status, ['completed', 'paid']),
          sql`${jobs.updatedAt} >= ${from}`,
          sql`${jobs.updatedAt} <= ${to}`,
          isNull(jobs.deletedAt),
        ),
      )
      .orderBy(asc(jobs.updatedAt));
  }

  /** Jobs voided within a time window — for day reports. */
  async listVoidedBetween(from: number, to: number): Promise<Job[]> {
    return this.db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'voided'),
          sql`${jobs.updatedAt} >= ${from}`,
          sql`${jobs.updatedAt} <= ${to}`,
          isNull(jobs.deletedAt),
        ),
      )
      .orderBy(asc(jobs.updatedAt));
  }

  async listForWasher(washerId: string): Promise<QueueEntry[]> {
    return this.db
      .select(JOB_SELECT)
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(
        and(
          eq(jobs.assignedTo, washerId),
          inArray(jobs.status, ['assigned', 'in_progress', 'quality_check']),
          isNull(jobs.deletedAt),
        ),
      )
      .orderBy(asc(jobs.createdAt));
  }

  async listWorkingWithDetails(): Promise<QueueEntry[]> {
    return this.db
      .select(JOB_SELECT)
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(and(inArray(jobs.status, [...ACTIVE_STATUSES]), isNull(jobs.deletedAt)))
      .orderBy(asc(jobs.createdAt));
  }

  /** Most recent active (non-terminal) job for a plate number, for duplicate-entry guard. */
  async findActiveByPlate(plate: string): Promise<QueueEntry | undefined> {
    const rows = await this.db
      .select(JOB_SELECT)
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(
        and(
          eq(vehicles.plateNumber, normalizePlate(plate)),
          inArray(jobs.status, [...WORKING_STATUSES]),
          isNull(jobs.deletedAt),
        ),
      )
      .orderBy(desc(jobs.createdAt))
      .limit(1);
    return rows[0];
  }

  async countByStatus(status: JobStatus): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.status, status), isNull(jobs.deletedAt)));
    return rows[0]?.count ?? 0;
  }

  /** Most recent paid jobs with their payment rows — for the Collect history. */
  async listPaidWithDetails(limit = 20): Promise<PaymentHistoryEntry[]> {
    return this.db
      .select({
        job: jobs,
        vehicle: vehicles,
        customer: customers,
        service: services,
        payment: payments,
      })
      .from(jobs)
      .innerJoin(payments, eq(jobs.id, payments.jobId))
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(
        and(
          eq(jobs.status, 'paid'),
          isNull(jobs.deletedAt),
          isNull(payments.deletedAt),
          isNull(payments.voidedAt),
        ),
      )
      .orderBy(sql`${payments.paidAt} desc`)
      .limit(limit);
  }

  /** Every non-deleted job for a vehicle, newest first, with payment when paid. */
  async listForVehicle(vehicleId: string): Promise<VehicleHistoryEntry[]> {
    return this.db
      .select({
        job: jobs,
        vehicle: vehicles,
        customer: customers,
        service: services,
        payment: payments,
      })
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .leftJoin(payments, eq(payments.jobId, jobs.id))
      .where(and(eq(jobs.vehicleId, vehicleId), isNull(jobs.deletedAt)))
      .orderBy(desc(jobs.createdAt));
  }
}
