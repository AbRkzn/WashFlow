import { db } from '@/data/db';
import {
  AppointmentRepository,
  DayCloseRepository,
  JobRepository,
} from '@/data/repositories';
import { toDateKey } from '@/domain/appointment';
import { formatDay } from '@/domain/day-close';
import { formatClockTime } from '@/utils/time';
import { formatPesos } from '@/utils/money';
import { listAuditTrail, type AuditTrailEntry } from '@/services/audit';
import { auditActionLabel, auditDetailsSummary } from '@/domain/audit';

export interface ActivityItem {
  id: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  tint: string;
  title: string;
  body: string;
  createdAt: number;
  actorId?: string;
  assignedTo?: string;
}

const jobRepository = new JobRepository(db);
const appointmentRepository = new AppointmentRepository(db);
const dayCloseRepository = new DayCloseRepository(db);

const ICON_BY_STATUS: Record<string, { icon: ActivityItem['icon']; tint: string }> = {
  queued: { icon: 'car-sport-outline', tint: '#0891B2' },
  assigned: { icon: 'hand-left-outline', tint: '#0891B2' },
  in_progress: { icon: 'play-circle-outline', tint: '#0891B2' },
  quality_check: { icon: 'checkmark-done-outline', tint: '#7C3AED' },
  completed: { icon: 'checkmark-circle-outline', tint: '#059669' },
  paid: { icon: 'cash-outline', tint: '#059669' },
  voided: { icon: 'close-circle-outline', tint: '#DC2626' },
};

const JOB_TITLES: Record<string, string> = {
  queued: 'Vehicle checked in',
  assigned: 'Job assigned',
  in_progress: 'Job started',
  quality_check: 'Sent to quality check',
  completed: 'Job completed',
  paid: 'Payment collected',
  voided: 'Job voided',
};

function jobBody(plate: string, serviceName: string | null, amountCents?: number): string {
  const parts = [`${plate} · ${serviceName ?? 'Service'}`];
  if (amountCents !== undefined) {
    parts.push(formatPesos(amountCents));
  }
  return parts.join(' · ');
}

/** Job-centric feed items (one per recent job, latest status). */
async function jobItems(): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  const add = (entry: { job: { id: string; status: string; createdAt: number; priceCents: number; assignedTo?: string | null } }, plate: string, serviceName: string | null) => {
    const meta = ICON_BY_STATUS[entry.job.status] ?? ICON_BY_STATUS.queued;
    const item: ActivityItem = {
      id: `job:${entry.job.id}`,
      icon: meta.icon,
      tint: meta.tint,
      title: JOB_TITLES[entry.job.status] ?? 'Job updated',
      body: jobBody(plate, serviceName, entry.job.status === 'paid' ? entry.job.priceCents : undefined),
      createdAt: entry.job.createdAt,
      actorId: entry.job.assignedTo ?? undefined,
    };
    items.push(item);
  };

  const [queued, working, completed, paid] = await Promise.all([
    jobRepository.listQueuedWithDetails(),
    jobRepository.listWorkingWithDetails(),
    jobRepository.listCompletedWithDetails(),
    jobRepository.listPaidWithDetails(20),
  ]);
  for (const entry of queued) {
    add(entry, entry.vehicle.plateNumber, entry.service?.name ?? null);
  }
  for (const entry of working) {
    add(entry, entry.vehicle.plateNumber, entry.service?.name ?? null);
  }
  for (const entry of completed) {
    add(entry, entry.vehicle.plateNumber, entry.service?.name ?? null);
  }
  for (const entry of paid) {
    add(
      { job: { ...entry.job, status: 'paid', priceCents: entry.payment.amountCents } },
      entry.vehicle.plateNumber,
      entry.service?.name ?? null,
    );
  }
  return items;
}

/** Appointment feed items (today's booked appointments). */
async function appointmentItems(): Promise<ActivityItem[]> {
  const today = toDateKey(Date.now());
  const entries = await appointmentRepository.listForDate(today);
  return entries.map((entry) => ({
    id: `appointment:${entry.appointment.id}`,
    icon: 'calendar-outline' as const,
    tint: '#0891B2',
    title: 'Appointment booked',
    body: `${entry.vehicle.plateNumber} · ${entry.service?.name ?? 'Service'} · ${formatClockTime(entry.appointment.slotStart)}`,
    createdAt: entry.appointment.createdAt,
  }));
}

/** Day-close feed items. */
async function dayCloseItems(): Promise<ActivityItem[]> {
  const closes = await dayCloseRepository.list();
  return closes.map((close) => ({
    id: `day-close:${close.id}`,
    icon: 'sunny-outline' as const,
    tint: '#0891B2',
    title: 'Day closed',
    body: `${formatDay(close.day)} · ${formatPesos(close.revenueCents)} revenue`,
    createdAt: close.closedAt,
    actorId: close.closedBy ?? undefined,
  }));
}

function parseAssignedTo(entry: AuditTrailEntry): string | undefined {
  if (!entry.details) return undefined;
  try {
    const parsed = JSON.parse(entry.details) as { assignedTo?: string };
    return parsed.assignedTo ?? undefined;
  } catch {
    return undefined;
  }
}

/** Audit-trail feed items (the classic mapping). */
function auditItems(entries: AuditTrailEntry[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const entry of entries) {
    const body = auditDetailsSummary(entry.details);
    let item: ActivityItem | null = null;
    switch (entry.action) {
      case 'sign-in':
        item = { id: `audit:${entry.id}`, icon: 'log-in-outline', tint: '#0891B2', title: 'Signed in', body: body || 'Welcome back to WashFlow.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'sign-out':
        item = { id: `audit:${entry.id}`, icon: 'log-out-outline', tint: '#64748B', title: 'Signed out', body: body || 'Your session ended on this device.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'job-checked-in':
        item = { id: `audit:${entry.id}`, icon: 'car-sport-outline', tint: '#0891B2', title: 'Vehicle checked in', body: body || 'A new job was added to the queue.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'job-claim':
        item = { id: `audit:${entry.id}`, icon: 'hand-left-outline', tint: '#0891B2', title: 'Job claimed', body: body || 'A job was added to your list.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'job-force-assign':
      case 'job-reassign':
        item = { id: `audit:${entry.id}`, icon: 'swap-horizontal-outline', tint: '#7C3AED', title: auditActionLabel(entry.action), body: body || 'A job was assigned to you.', createdAt: entry.createdAt, actorId: entry.actorId, assignedTo: parseAssignedTo(entry) };
        break;
      case 'job-started':
        item = { id: `audit:${entry.id}`, icon: 'play-circle-outline', tint: '#0891B2', title: 'Job started', body: body || 'You started working on a vehicle.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'job-quality-check':
        item = { id: `audit:${entry.id}`, icon: 'checkmark-done-outline', tint: '#7C3AED', title: 'Sent to quality check', body: body || 'Your job is waiting for inspection.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'job-completed':
        item = { id: `audit:${entry.id}`, icon: 'checkmark-circle-outline', tint: '#059669', title: 'Job completed', body: body || 'A job was marked complete.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'job-paid':
        item = { id: `audit:${entry.id}`, icon: 'cash-outline', tint: '#059669', title: 'Payment collected', body: body || 'A payment was recorded.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'job-void':
      case 'job-void-manager':
        item = { id: `audit:${entry.id}`, icon: 'close-circle-outline', tint: '#DC2626', title: 'Job voided', body: body || 'A job was voided.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'void-requested':
        item = { id: `audit:${entry.id}`, icon: 'shield-checkmark-outline', tint: '#D97706', title: 'Void requested', body: body || 'A void request needs review.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'void-approved':
        item = { id: `audit:${entry.id}`, icon: 'shield-checkmark-outline', tint: '#DC2626', title: 'Void approved', body: body || 'A void request was approved.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'void-rejected':
        item = { id: `audit:${entry.id}`, icon: 'shield-outline', tint: '#64748B', title: 'Void rejected', body: body || 'A void request was rejected.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'appointment-booked':
        item = { id: `audit:${entry.id}`, icon: 'calendar-outline', tint: '#0891B2', title: 'Appointment booked', body: body || 'A new appointment was booked.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'appointment-auto-rescheduled':
      case 'appointment-sync-reflowed':
        item = { id: `audit:${entry.id}`, icon: 'alert-circle-outline', tint: '#D97706', title: 'Appointment rescheduled', body: body || 'A booking was moved to the next free slot.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'appointment-cancelled':
        item = { id: `audit:${entry.id}`, icon: 'calendar-clear-outline', tint: '#64748B', title: 'Appointment cancelled', body: body || 'A booking was cancelled.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'expense-logged':
        item = { id: `audit:${entry.id}`, icon: 'receipt-outline', tint: '#D97706', title: 'Expense logged', body: body || 'An expense was recorded.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'stock-adjusted':
      case 'inventory-item-created':
        item = { id: `audit:${entry.id}`, icon: 'cube-outline', tint: '#7C3AED', title: auditActionLabel(entry.action), body: body || 'Inventory was updated.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'day-close':
        item = { id: `audit:${entry.id}`, icon: 'sunny-outline', tint: '#0891B2', title: 'Day closed', body: body || 'The day was closed with a report.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      case 'conflict-resolved':
        item = { id: `audit:${entry.id}`, icon: 'git-compare-outline', tint: '#7C3AED', title: 'Sync conflict resolved', body: body || 'A conflicting change was reviewed.', createdAt: entry.createdAt, actorId: entry.actorId };
        break;
      default:
        item = null;
    }
    if (item) {
      items.push(item);
    }
  }
  return items;
}

/**
 * Merged activity feed: real jobs/appointments/day-closes plus the audit
 * trail, newest first. Populated whenever the device has any data, so it is
 * never empty on a fresh install with demo data loaded.
 */
export async function listRecentActivity(limit = 50): Promise<ActivityItem[]> {
  let jobs: ActivityItem[] = [];
  let appointments: ActivityItem[] = [];
  let dayCloses: ActivityItem[] = [];
  let audit: ActivityItem[] = [];
  try {
    jobs = await jobItems();
  } catch (error) {
    console.error('[feed] jobItems failed', error);
  }
  try {
    appointments = await appointmentItems();
  } catch (error) {
    console.error('[feed] appointmentItems failed', error);
  }
  try {
    dayCloses = await dayCloseItems();
  } catch (error) {
    console.error('[feed] dayCloseItems failed', error);
  }
  try {
    audit = await listAuditTrail(200).then(auditItems);
  } catch (error) {
    console.error('[feed] auditItems failed', error);
  }
  const seen = new Set<string>();
  const merged = [...jobs, ...appointments, ...dayCloses, ...audit]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  return merged.slice(0, limit);
}
