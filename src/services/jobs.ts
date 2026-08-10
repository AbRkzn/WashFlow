import { db } from '@/data/db';
import { JobRepository, UserRepository, VehicleRepository, type QueueEntry } from '@/data/repositories';
import type { User } from '@/data/schema';
import { logAudit } from '@/services/audit';
import { notifyJobAssigned } from '@/services/notifications';
import { notifyReadyForPickup } from '@/services/customer-notices';
import { sendPushToUser } from '@/services/push';

const jobRepository = new JobRepository(db);
const userRepository = new UserRepository(db);
const vehicleRepository = new VehicleRepository(db);

export interface WorkingEntry extends QueueEntry {
  assignedName: string | null;
}

async function loadAssignedNames(entries: QueueEntry[]): Promise<WorkingEntry[]> {  const ids = [...new Set(entries.map((e) => e.job.assignedTo).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) {
    return entries.map((e) => ({ ...e, assignedName: null }));
  }
  const users = await userRepository.listAll();
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return entries.map((e) => ({
    ...e,
    assignedName: e.job.assignedTo ? (nameById.get(e.job.assignedTo) ?? null) : null,
  }));
}

async function notifyAssignment(jobId: string, washerId: string): Promise<void> {
  try {
    const job = await jobRepository.findById(jobId);
    if (!job?.vehicleId) return;
    const vehicle = await vehicleRepository.findById(job.vehicleId);
    if (!vehicle) return;
    const washer = await userRepository.findById(washerId);
    await notifyJobAssigned(vehicle.plateNumber, washer?.name ?? 'washer');
    await sendPushToUser({
      userId: washerId,
      title: 'New job assigned',
      body: `${vehicle.plateNumber} is assigned to you.`,
      data: { jobId, plate: vehicle.plateNumber },
    });
  } catch (error) {
    console.warn('Assignment notification failed (non-fatal)', error);
  }
}

export async function listWashers(): Promise<User[]> {
  return userRepository.listWashers();
}

export async function listWasherBoard(washerId: string): Promise<QueueEntry[]> {
  return jobRepository.listForWasher(washerId);
}

export async function listWorkingBoard(): Promise<WorkingEntry[]> {
  return loadAssignedNames(await jobRepository.listWorkingWithDetails());
}

export async function claimNextJob(washerId: string): Promise<QueueEntry | null> {
  const queued = await jobRepository.listQueuedWithDetails();
  const next = queued[0];
  if (!next) {
    return null;
  }
  const claimed = await jobRepository.claim(next.job.id, washerId);
  if (!claimed) {
    throw new Error('That job was just claimed by someone else.');
  }
  await logAudit({ actorId: washerId, action: 'job-claim', entity: 'job', entityId: next.job.id });
  return next;
}

export async function claimJob(jobId: string, washerId: string): Promise<void> {
  const claimed = await jobRepository.claim(jobId, washerId);
  if (!claimed) {
    throw new Error('That job is no longer available to claim.');
  }
  await logAudit({ actorId: washerId, action: 'job-claim', entity: 'job', entityId: jobId });
}

export async function startJob(jobId: string, washerId: string): Promise<void> {
  const moved = await jobRepository.transition(jobId, ['assigned'], 'in_progress');
  if (!moved) {
    throw new Error('This job can only be started once it is claimed and assigned.');
  }
  await logAudit({ actorId: washerId, action: 'job-started', entity: 'job', entityId: jobId });
}

export async function markDone(jobId: string, washerId: string): Promise<void> {
  const moved = await jobRepository.transition(jobId, ['in_progress'], 'quality_check');
  if (!moved) {
    throw new Error('Only an in-progress job can be sent to quality check.');
  }
  await logAudit({ actorId: washerId, action: 'job-quality-check', entity: 'job', entityId: jobId });
}

export async function approveQuality(jobId: string, actorId: string): Promise<void> {
  const moved = await jobRepository.transition(jobId, ['quality_check'], 'completed');
  if (!moved) {
    throw new Error('Only a job in quality check can be marked complete.');
  }
  await logAudit({ actorId, action: 'job-completed', entity: 'job', entityId: jobId });
  await notifyReadyForPickup(jobId);
}

export async function forceAssign(jobId: string, washerId: string, actorId: string): Promise<void> {
  const assigned = await jobRepository.assignTo(jobId, washerId);
  if (!assigned) {
    throw new Error('Only a queued job can be force-assigned.');
  }
  await logAudit({
    actorId,
    action: 'job-force-assign',
    entity: 'job',
    entityId: jobId,
    details: { assignedTo: washerId },
  });
  await notifyAssignment(jobId, washerId);
}

export async function reassignJob(jobId: string, washerId: string, actorId: string): Promise<void> {
  const reassigned = await jobRepository.reassign(jobId, washerId);
  if (!reassigned) {
    throw new Error('That job cannot be reassigned in its current state.');
  }
  await logAudit({
    actorId,
    action: 'job-reassign',
    entity: 'job',
    entityId: jobId,
    details: { assignedTo: washerId },
  });
  await notifyAssignment(jobId, washerId);
}

export async function releaseJob(jobId: string, actorId: string): Promise<void> {
  const released = await jobRepository.release(jobId);
  if (!released) {
    throw new Error('Only an assigned or in-progress job can be released back to the queue.');
  }
  await logAudit({ actorId, action: 'job-release', entity: 'job', entityId: jobId });
}
