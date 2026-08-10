import { db } from '@/data/db';
import { JobRepository, type QueueEntry } from '@/data/repositories';
import {
  buildCustomerNotice,
  type CustomerNoticeMilestone,
} from '@/domain/customer-notice';
import { notify } from '@/services/notifications';

const jobRepository = new JobRepository(db);

export interface CustomerNotice {
  plateNumber: string;
  customerName: string;
  text: string;
}

/** Builds a shareable customer status message for a job + milestone. */
export async function buildNoticeForJob(
  jobId: string,
  milestone: CustomerNoticeMilestone,
): Promise<CustomerNotice> {
  const entry = await requireEntry(jobId);
  return {
    plateNumber: entry.vehicle.plateNumber,
    customerName: entry.customer.name,
    text: buildCustomerNotice({
      milestone,
      plateNumber: entry.vehicle.plateNumber,
      customerName: entry.customer.name,
      serviceName: entry.service?.name ?? null,
    }),
  };
}

/** Fires the local "ready for pickup" counter alert for a completed job. */
export async function notifyReadyForPickup(jobId: string): Promise<void> {
  try {
    const entry = await requireEntry(jobId);
    await notify(
      'Vehicle ready for pickup',
      `${entry.vehicle.plateNumber} — ${entry.customer.name} is ready for pickup.`,
    );
  } catch (error) {
    console.warn('Ready-for-pickup notification failed (non-fatal)', error);
  }
}

async function requireEntry(jobId: string): Promise<QueueEntry> {
  const entry = await jobRepository.findByIdWithDetails(jobId);
  if (!entry) {
    throw new Error('Job not found.');
  }
  return entry;
}
