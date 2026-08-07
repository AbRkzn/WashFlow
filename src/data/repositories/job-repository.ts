import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import { customers, jobs, services, vehicles, type Customer, type Job, type Service, type Vehicle } from '@/data/schema';
import type { JobStatus } from '@/domain/job';

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

  async listByStatus(status: JobStatus): Promise<Job[]> {
    return this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, status), isNull(jobs.deletedAt)))
      .orderBy(asc(jobs.createdAt));
  }

  async listQueuedWithDetails(): Promise<QueueEntry[]> {
    return this.db
      .select({ job: jobs, vehicle: vehicles, customer: customers, service: services })
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(services, eq(jobs.serviceId, services.id))
      .where(and(eq(jobs.status, 'queued'), isNull(jobs.deletedAt)))
      .orderBy(asc(jobs.createdAt));
  }

  async countByStatus(status: JobStatus): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.status, status), isNull(jobs.deletedAt)));
    return rows[0]?.count ?? 0;
  }
}
