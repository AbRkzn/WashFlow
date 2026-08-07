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
