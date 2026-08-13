import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '@/data/db';
import { baseRecord } from '@/data/record';
import {
  appointments,
  customers,
  services,
  vehicles,
  type Appointment,
  type Customer,
  type Service,
  type Vehicle,
} from '@/data/schema';
import type { AppointmentStatus } from '@/domain/appointment';
import { enqueueChange } from '@/sync/outbox';

export interface NewAppointment {
  vehicleId: string;
  customerId: string;
  serviceId: string;
  date: string;
  slotStart: number;
  durationMinutes?: number;
  status?: AppointmentStatus;
  rescheduled?: boolean;
  rescheduledFrom?: number | null;
  notes?: string | null;
}

export interface AppointmentEntry {
  appointment: Appointment;
  vehicle: Vehicle;
  customer: Customer;
  service: Service | null;
}

const APPOINTMENT_SELECT = {
  appointment: appointments,
  vehicle: vehicles,
  customer: customers,
  service: services,
} as const;

export class AppointmentRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewAppointment & { id?: string }): Promise<Appointment> {
    const base = baseRecord();
    const record: Appointment = {
      ...base,
      id: input.id ?? base.id,
      vehicleId: input.vehicleId,
      customerId: input.customerId,
      serviceId: input.serviceId,
      jobId: null,
      date: input.date,
      slotStart: input.slotStart,
      durationMinutes: input.durationMinutes ?? 30,
      status: input.status ?? 'booked',
      rescheduled: input.rescheduled ?? false,
      rescheduledFrom: input.rescheduledFrom ?? null,
      notes: input.notes ?? null,
    };
    await this.db.insert(appointments).values(record);
    await enqueueChange('appointment', record.id, 'upsert');
    return record;
  }

  async findById(id: string): Promise<Appointment | undefined> {
    const rows = await this.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findByIdWithDetails(id: string): Promise<AppointmentEntry | undefined> {
    const rows = await this.db
      .select(APPOINTMENT_SELECT)
      .from(appointments)
      .innerJoin(vehicles, eq(appointments.vehicleId, vehicles.id))
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findBySlot(date: string, slotStart: number): Promise<Appointment | undefined> {
    const rows = await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.date, date),
          eq(appointments.slotStart, slotStart),
          eq(appointments.status, 'booked'),
          isNull(appointments.deletedAt),
        ),
      )
      .limit(1);
    return rows[0];
  }

  /**
   * First booked appointment whose window [slotStart, slotStart+duration)
   * overlaps the given [start, start+duration) window (free-form support).
   */
  async findConflicting(
    date: string,
    start: number,
    durationMinutes: number,
  ): Promise<Appointment | undefined> {
    const end = start + durationMinutes * 60 * 1000;
    const rows = await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.date, date),
          eq(appointments.status, 'booked'),
          isNull(appointments.deletedAt),
          sql`${appointments.slotStart} < ${end}`,
          sql`${appointments.slotStart} + ${appointments.durationMinutes} * 60000 > ${start}`,
        ),
      )
      .limit(1);
    return rows[0];
  }

  async listForDate(date: string): Promise<AppointmentEntry[]> {
    return this.db
      .select(APPOINTMENT_SELECT)
      .from(appointments)
      .innerJoin(vehicles, eq(appointments.vehicleId, vehicles.id))
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(eq(appointments.date, date), eq(appointments.status, 'booked')))
      .orderBy(asc(appointments.slotStart));
  }

  async nextAvailableSlot(
    date: string,
    fromSlotStart: number,
    slotMinutes: number,
    closeMinutes: number,
  ): Promise<number | null> {
    const entries = await this.db
      .select({ slotStart: appointments.slotStart })
      .from(appointments)
      .where(and(eq(appointments.date, date), eq(appointments.status, 'booked')));
    const taken = new Set(entries.map((entry) => entry.slotStart));
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = dayStart + closeMinutes * 60 * 1000;
    let candidate = fromSlotStart + slotMinutes * 60 * 1000;
    while (candidate < dayEnd) {
      if (!taken.has(candidate)) {
        return candidate;
      }
      candidate += slotMinutes * 60 * 1000;
    }
    return null;
  }

  /**
   * First start time at or after `fromStart` whose window of `durationMinutes`
   * fits within business hours without overlapping any booked appointment.
   * Steps forward by `stepMinutes` (free-form granularity).
   */
  async findNextFreeStart(
    date: string,
    fromStart: number,
    durationMinutes: number,
    closeMinutes: number,
    stepMinutes: number,
  ): Promise<number | null> {
    const entries = await this.db
      .select({ slotStart: appointments.slotStart, durationMinutes: appointments.durationMinutes })
      .from(appointments)
      .where(and(eq(appointments.date, date), eq(appointments.status, 'booked')));
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = dayStart + closeMinutes * 60 * 1000;
    const latestStart = dayEnd - durationMinutes * 60 * 1000;
    const stepMs = stepMinutes * 60 * 1000;
    let candidate = fromStart;
    while (candidate <= latestStart) {
      const candidateEnd = candidate + durationMinutes * 60 * 1000;
      const clash = entries.some(
        (entry) =>
          candidate < entry.slotStart + entry.durationMinutes * 60 * 1000 &&
          entry.slotStart < candidateEnd,
      );
      if (!clash) {
        return candidate;
      }
      candidate += stepMs;
    }
    return null;
  }

  async moveSlot(id: string, newSlotStart: number, fromSlotStart: number): Promise<boolean> {
    const rows = await this.db
      .update(appointments)
      .set({
        slotStart: newSlotStart,
        rescheduled: true,
        rescheduledFrom: fromSlotStart,
        updatedAt: Date.now(),
        version: sql`${appointments.version} + 1`,
      })
      .where(and(eq(appointments.id, id), eq(appointments.status, 'booked'), isNull(appointments.deletedAt)))
      .returning({ id: appointments.id });
    if (rows.length > 0) {
      await enqueueChange('appointment', id, 'upsert');
    }
    return rows.length > 0;
  }

  async markCancelled(id: string, at: number = Date.now()): Promise<boolean> {
    const rows = await this.db
      .update(appointments)
      .set({ status: 'cancelled', updatedAt: at, version: sql`${appointments.version} + 1` })
      .where(and(eq(appointments.id, id), eq(appointments.status, 'booked')))
      .returning({ id: appointments.id });
    if (rows.length > 0) {
      await enqueueChange('appointment', id, 'upsert');
    }
    return rows.length > 0;
  }

  async markNoShow(id: string, at: number = Date.now()): Promise<boolean> {
    const rows = await this.db
      .update(appointments)
      .set({ status: 'no-show', updatedAt: at, version: sql`${appointments.version} + 1` })
      .where(and(eq(appointments.id, id), eq(appointments.status, 'booked')))
      .returning({ id: appointments.id });
    if (rows.length > 0) {
      await enqueueChange('appointment', id, 'upsert');
    }
    return rows.length > 0;
  }

  /** Appointments marked no-show for a given day (non-deleted), for reporting. */
  async listNoShowsForDate(date: string): Promise<AppointmentEntry[]> {
    return this.db
      .select(APPOINTMENT_SELECT)
      .from(appointments)
      .innerJoin(vehicles, eq(appointments.vehicleId, vehicles.id))
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(eq(appointments.date, date), eq(appointments.status, 'no-show'), isNull(appointments.deletedAt)))
      .orderBy(asc(appointments.slotStart));
  }

  /** All no-show appointments (non-deleted), for month reporting. */
  async listNoShows(): Promise<Appointment[]> {
    return this.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.status, 'no-show'), isNull(appointments.deletedAt)))
      .orderBy(asc(appointments.slotStart));
  }

  async markCompleted(id: string, jobId: string, at: number = Date.now()): Promise<boolean> {
    const rows = await this.db
      .update(appointments)
      .set({ status: 'completed', jobId, updatedAt: at, version: sql`${appointments.version} + 1` })
      .where(and(eq(appointments.id, id), eq(appointments.status, 'booked')))
      .returning({ id: appointments.id });
    if (rows.length > 0) {
      await enqueueChange('appointment', id, 'upsert');
    }
    return rows.length > 0;
  }
}
