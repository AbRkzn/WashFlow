import { db } from '@/data/db';
import {
  JobRepository,
  PaymentRepository,
  UserRepository,
  VoidRequestRepository,
  type PaymentHistoryEntry,
  type QueueEntry,
  type VoidRequestEntry,
} from '@/data/repositories';
import { VOIDABLE_STATUSES } from '@/domain/job';
import { assertCanCashierVoid } from '@/domain/payment';
import { logAudit } from '@/services/audit';

const jobRepository = new JobRepository(db);
const paymentRepository = new PaymentRepository(db);
const voidRequestRepository = new VoidRequestRepository(db);
const userRepository = new UserRepository(db);

export interface PendingVoidEntry extends VoidRequestEntry {
  requesterName: string | null;
}

export interface CollectionHistoryEntry extends PaymentHistoryEntry {
  receivedByName: string | null;
}

export async function listCollectibleJobs(): Promise<QueueEntry[]> {
  return jobRepository.listCompletedWithDetails();
}

/** Most recent paid jobs with collector name — for the Collect history. */
export async function listCollectionHistory(limit = 20): Promise<CollectionHistoryEntry[]> {
  const entries = await jobRepository.listPaidWithDetails(limit);
  const users = await userRepository.listAll();
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return entries.map((entry) => ({
    ...entry,
    receivedByName: entry.payment.receivedBy
      ? (nameById.get(entry.payment.receivedBy) ?? null)
      : null,
  }));
}

export async function payJob(jobId: string, actorId: string): Promise<void> {
  const job = await jobRepository.findById(jobId);
  if (!job) {
    throw new Error('Job not found.');
  }
  const moved = await jobRepository.transition(jobId, ['completed'], 'paid');
  if (!moved) {
    throw new Error('Only a completed job can be collected for payment.');
  }
  await paymentRepository.add({
    jobId,
    amountCents: job.priceCents,
    method: 'cash',
    receivedBy: actorId,
  });
  await logAudit({
    actorId,
    action: 'job-paid',
    entity: 'job',
    entityId: jobId,
    details: { amountCents: job.priceCents, method: 'cash' },
  });
}

export async function voidJob(jobId: string, actorId: string, reason?: string): Promise<void> {
  const job = await jobRepository.findById(jobId);
  if (!job) {
    throw new Error('Job not found.');
  }
  if (job.status === 'voided') {
    throw new Error('This job is already voided.');
  }
  const payment = await paymentRepository.findForJob(jobId);
  if (payment) {
    throw new Error('Paid jobs cannot be voided directly. Request manager approval instead.');
  }
  assertCanCashierVoid(job.status);
  const moved = await jobRepository.transition(jobId, ['queued'], 'voided');
  if (!moved) {
    throw new Error('That job is no longer available to void.');
  }
  await voidRequestRepository.create({
    jobId,
    requestedBy: actorId,
    reason: reason ?? null,
    status: 'approved',
    resolvedBy: actorId,
  });
  await logAudit({
    actorId,
    action: 'job-void',
    entity: 'job',
    entityId: jobId,
    details: { reason: reason ?? null, approval: 'cashier' },
  });
}

/**
 * Manager-authorised direct void (the Day Board "Delete"). Allowed for any
 * active job status, regardless of pending sync conflicts. Leaves an approved
 * `void_request` row so day-close reporting still counts it.
 */
export async function voidJobAsManager(
  jobId: string,
  managerId: string,
  reason?: string,
): Promise<void> {
  const job = await jobRepository.findById(jobId);
  if (!job) {
    throw new Error('Job not found.');
  }
  if (job.status === 'voided') {
    throw new Error('This job is already voided.');
  }
  const payment = await paymentRepository.findForJob(jobId);
  if (payment) {
    await paymentRepository.markVoided(payment.id);
  }
  const moved = await jobRepository.transition(jobId, [...VOIDABLE_STATUSES], 'voided');
  if (!moved) {
    throw new Error('That job can no longer be voided.');
  }
  await voidRequestRepository.create({
    jobId,
    requestedBy: managerId,
    reason: reason ?? null,
    status: 'approved',
    resolvedBy: managerId,
  });
  await logAudit({
    actorId: managerId,
    action: 'job-void-manager',
    entity: 'job',
    entityId: jobId,
    details: { reason: reason ?? null, approval: 'manager' },
  });
}

export async function requestVoid(jobId: string, actorId: string, reason?: string): Promise<void> {
  const job = await jobRepository.findById(jobId);
  if (!job) {
    throw new Error('Job not found.');
  }
  if (job.status === 'voided') {
    throw new Error('This job is already voided.');
  }
  const payment = await paymentRepository.findForJob(jobId);
  if (!payment) {
    assertCanCashierVoid(job.status);
  }
  await voidRequestRepository.create({
    jobId,
    requestedBy: actorId,
    reason: reason ?? null,
    status: 'pending',
    resolvedBy: null,
    resolvedAt: null,
  });
  await logAudit({
    actorId,
    action: 'void-requested',
    entity: 'job',
    entityId: jobId,
    details: { reason: reason ?? null },
  });
}

export async function listPendingVoidRequests(): Promise<PendingVoidEntry[]> {
  const entries = await voidRequestRepository.listPendingWithDetails();
  const users = await userRepository.listAll();
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return entries.map((entry) => ({
    ...entry,
    requesterName: entry.request.requestedBy
      ? (nameById.get(entry.request.requestedBy) ?? null)
      : null,
  }));
}

export async function approveVoidRequest(requestId: string, managerId: string): Promise<void> {
  const request = await voidRequestRepository.findById(requestId);
  if (!request) {
    throw new Error('Void request not found.');
  }
  if (request.status !== 'pending') {
    throw new Error('This request was already resolved.');
  }
  const resolved = await voidRequestRepository.resolve(requestId, 'approved', managerId);
  if (!resolved) {
    throw new Error('This request was already resolved.');
  }
  const job = request.jobId ? await jobRepository.findById(request.jobId) : undefined;
  if (job) {
    await jobRepository.transition(job.id, [...VOIDABLE_STATUSES], 'voided');
    const payment = await paymentRepository.findForJob(job.id);
    if (payment) {
      await paymentRepository.markVoided(payment.id);
    }
  }
  await logAudit({
    actorId: managerId,
    action: 'void-approved',
    entity: 'job',
    entityId: request.jobId,
    details: { requestId },
  });
}

export async function rejectVoidRequest(requestId: string, managerId: string): Promise<void> {
  const request = await voidRequestRepository.findById(requestId);
  if (!request) {
    throw new Error('Void request not found.');
  }
  if (request.status !== 'pending') {
    throw new Error('This request was already resolved.');
  }
  const resolved = await voidRequestRepository.resolve(requestId, 'rejected', managerId);
  if (!resolved) {
    throw new Error('This request was already resolved.');
  }
  await logAudit({
    actorId: managerId,
    action: 'void-rejected',
    entity: 'job',
    entityId: request.jobId,
    details: { requestId },
  });
}
