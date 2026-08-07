export const JOB_STATUSES = [
  'queued',
  'assigned',
  'in_progress',
  'quality_check',
  'completed',
  'paid',
  'voided',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  quality_check: 'Quality Check',
  completed: 'Completed',
  paid: 'Paid',
  voided: 'Voided',
};

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued: ['assigned', 'voided'],
  assigned: ['in_progress', 'queued', 'voided'],
  in_progress: ['quality_check', 'assigned', 'queued', 'voided'],
  quality_check: ['completed', 'in_progress', 'voided'],
  completed: ['paid', 'voided'],
  paid: ['voided'],
  voided: [],
};

export const WORKING_STATUSES: readonly JobStatus[] = [
  'queued',
  'assigned',
  'in_progress',
  'quality_check',
];

export const ACTIVE_STATUSES: readonly JobStatus[] = [...WORKING_STATUSES, 'completed'];

export const VOIDABLE_STATUSES: readonly JobStatus[] = [
  'queued',
  'assigned',
  'in_progress',
  'quality_check',
  'completed',
  'paid',
];

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: JobStatus, to: JobStatus, message?: string): void {
  if (!canTransition(from, to)) {
    throw new Error(message ?? `Cannot move a job from "${from}" to "${to}".`);
  }
}
