import { db } from '@/data/db';
import {
  AppointmentRepository,
  JobRepository,
  RecentPlateRepository,
  type AppointmentEntry,
} from '@/data/repositories';
import type { Appointment } from '@/data/schema';
import {
  DEFAULT_APPOINTMENT_DURATION,
  dateKeyToStartOfDay,
  formatSlotTime,
  generateSlotStarts,
  toDateKey,
} from '@/domain/appointment';
import { logAudit } from '@/services/audit';
import { getSchedule } from '@/services/settings';

const appointmentRepository = new AppointmentRepository(db);
const jobRepository = new JobRepository(db);
const recentPlateRepository = new RecentPlateRepository(db);

export interface SlotInfo {
  slotStart: number;
  timeLabel: string;
  inPast: boolean;
  available: boolean;
  entry: AppointmentEntry | null;
}

export interface BookAppointmentInput {
  date: string;
  slotStart: number;
  durationMinutes?: number;
  vehicleId: string;
  customerId: string;
  serviceId: string;
  notes?: string;
}

export interface BookAppointmentResult {
  appointment: Appointment;
  rescheduled: boolean;
  rescheduledFrom: number | null;
}

export async function listDaySlots(date: string): Promise<SlotInfo[]> {
  const schedule = await getSchedule();
  const now = Date.now();
  const starts = generateSlotStarts(date, schedule.openMinutes, schedule.closeMinutes, schedule.slotMinutes);
  const entries = await appointmentRepository.listForDate(date);
  const byStart = new Map(entries.map((entry) => [entry.appointment.slotStart, entry]));
  return starts.map((slotStart) => ({
    slotStart,
    timeLabel: formatSlotTime(slotStart),
    inPast: date === toDateKey(now) && slotStart < now,
    available: !byStart.has(slotStart),
    entry: byStart.get(slotStart) ?? null,
  }));
}

export async function bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult> {
  const durationMinutes = input.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION;
  const conflicting = await appointmentRepository.findConflicting(
    input.date,
    input.slotStart,
    durationMinutes,
  );
  if (!conflicting) {
    const appointment = await appointmentRepository.create({
      vehicleId: input.vehicleId,
      customerId: input.customerId,
      serviceId: input.serviceId,
      date: input.date,
      slotStart: input.slotStart,
      durationMinutes,
      rescheduled: false,
      rescheduledFrom: null,
      notes: input.notes,
    });
    return { appointment, rescheduled: false, rescheduledFrom: null };
  }

  const schedule = await getSchedule();
  const next = await appointmentRepository.findNextFreeStart(
    input.date,
    input.slotStart,
    durationMinutes,
    schedule.closeMinutes,
    schedule.slotMinutes,
  );
  if (!next) {
    throw new Error('No available time remains for this day.');
  }
  const appointment = await appointmentRepository.create({
    vehicleId: input.vehicleId,
    customerId: input.customerId,
    serviceId: input.serviceId,
    date: input.date,
    slotStart: next,
    durationMinutes,
    rescheduled: true,
    rescheduledFrom: input.slotStart,
    notes: input.notes,
  });
  await logAudit({
    actorId: input.customerId,
    action: 'appointment-auto-rescheduled',
    entity: 'appointment',
    entityId: appointment.id,
    details: { requestedSlot: input.slotStart, movedTo: next },
  });
  return { appointment, rescheduled: true, rescheduledFrom: input.slotStart };
}

/** Live conflict check for a prospective free-form time window. */
export async function findAppointmentConflict(
  date: string,
  slotStart: number,
  durationMinutes: number = DEFAULT_APPOINTMENT_DURATION,
): Promise<Appointment | null> {
  return (await appointmentRepository.findConflicting(date, slotStart, durationMinutes)) ?? null;
}

export async function cancelAppointment(appointmentId: string, actorId: string): Promise<void> {
  const cancelled = await appointmentRepository.markCancelled(appointmentId);
  if (!cancelled) {
    throw new Error('This appointment is no longer active.');
  }
  await logAudit({ actorId, action: 'appointment-cancelled', entity: 'appointment', entityId: appointmentId });
}

/**
 * Auto-reflow used when the server rejects a booked slot (`slot_taken`,
 * first-write-wins). Moves the appointment to the next free slot for the same
 * day and flags it "Rescheduled by system". Returns null when nothing moved.
 */
export async function reflowAppointmentOnConflict(appointmentId: string): Promise<Appointment | null> {
  const entry = await appointmentRepository.findByIdWithDetails(appointmentId);
  if (!entry || entry.appointment.status !== 'booked') {
    return null;
  }
  const schedule = await getSchedule();
  const { date, slotStart, durationMinutes } = entry.appointment;
  const next = await appointmentRepository.findNextFreeStart(
    date,
    slotStart,
    durationMinutes,
    schedule.closeMinutes,
    schedule.slotMinutes,
  );
  if (!next) {
    return null;
  }
  const moved = await appointmentRepository.moveSlot(appointmentId, next, slotStart);
  if (!moved) {
    return null;
  }
  await logAudit({
    actorId: entry.customer.id,
    action: 'appointment-sync-reflowed',
    entity: 'appointment',
    entityId: appointmentId,
    details: { from: slotStart, to: next },
  });
  return entry.appointment;
}

export async function checkInAppointment(
  appointmentId: string,
  actorId: string,
): Promise<Appointment> {
  const entry = await appointmentRepository.findByIdWithDetails(appointmentId);
  if (!entry) {
    throw new Error('Appointment not found.');
  }
  const { appointment, vehicle, service } = entry;
  if (appointment.status !== 'booked') {
    throw new Error('Only a booked appointment can be checked in.');
  }
  if (!appointment.vehicleId || !appointment.customerId || !appointment.serviceId || !service) {
    throw new Error('Appointment details are incomplete.');
  }

  const job = await jobRepository.create({
    customerId: appointment.customerId,
    vehicleId: appointment.vehicleId,
    serviceId: appointment.serviceId,
    status: 'queued',
    priceCents: service.priceCents,
    notes: appointment.notes,
  });
  await appointmentRepository.markCompleted(appointmentId, job.id);
  await recentPlateRepository.record(vehicle.plateNumber);
  await logAudit({ actorId, action: 'appointment-checked-in', entity: 'appointment', entityId: appointmentId });
  return appointment;
}

export async function listDayAppointments(date: string): Promise<AppointmentEntry[]> {
  return appointmentRepository.listForDate(date);
}

export function todayKey(): string {
  return toDateKey(Date.now());
}

export function shiftDateKey(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() + days);
  return toDateKey(base.getTime());
}

export function appointmentDayStart(date: string): number {
  return dateKeyToStartOfDay(date);
}
