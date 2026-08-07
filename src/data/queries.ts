import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveQuality,
  claimJob,
  claimNextJob,
  forceAssign,
  listWasherBoard,
  listWashers,
  listWorkingBoard,
  markDone,
  reassignJob,
  releaseJob,
  startJob,
} from '@/services/jobs';
import {
  countQueuedJobs,
  listActiveServices,
  listQueuedWithDetails,
  listRecentPlates,
} from '@/services/checkin';

export const jobKeys = {
  all: ['jobs'] as const,
  queued: ['jobs', 'queued'] as const,
  queuedCount: ['jobs', 'queued', 'count'] as const,
  washer: (washerId: string) => ['jobs', 'washer', washerId] as const,
  working: ['jobs', 'working'] as const,
};

export const serviceKeys = {
  active: ['services', 'active'] as const,
};

export const recentPlatesKeys = {
  list: ['recent-plates'] as const,
};

export const userKeys = {
  all: ['users'] as const,
  washers: ['users', 'washers'] as const,
};

export function useQueuedJobs() {
  return useQuery({
    queryKey: jobKeys.queued,
    queryFn: listQueuedWithDetails,
  });
}

export function useQueuedCount() {
  return useQuery({
    queryKey: jobKeys.queuedCount,
    queryFn: countQueuedJobs,
  });
}

export function useActiveServices() {
  return useQuery({
    queryKey: serviceKeys.active,
    queryFn: listActiveServices,
  });
}

export function useRecentPlates() {
  return useQuery({
    queryKey: recentPlatesKeys.list,
    queryFn: () => listRecentPlates(5),
  });
}

export function useWasherBoard(washerId: string) {
  return useQuery({
    queryKey: jobKeys.washer(washerId),
    queryFn: () => listWasherBoard(washerId),
    enabled: Boolean(washerId),
  });
}

export function useWorkingBoard() {
  return useQuery({
    queryKey: jobKeys.working,
    queryFn: listWorkingBoard,
  });
}

export function useWashers() {
  return useQuery({
    queryKey: userKeys.washers,
    queryFn: listWashers,
  });
}

function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: jobKeys.all });
}

export function useClaimNextJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (washerId: string) => claimNextJob(washerId),
    onSuccess: invalidate,
  });
}

export function useClaimJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string }) =>
      claimJob(input.jobId, input.washerId),
    onSuccess: invalidate,
  });
}

export function useStartJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string }) =>
      startJob(input.jobId, input.washerId),
    onSuccess: invalidate,
  });
}

export function useMarkDone() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string }) =>
      markDone(input.jobId, input.washerId),
    onSuccess: invalidate,
  });
}

export function useApproveQuality() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string }) =>
      approveQuality(input.jobId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useForceAssign() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string; actorId: string }) =>
      forceAssign(input.jobId, input.washerId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useReassignJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; washerId: string; actorId: string }) =>
      reassignJob(input.jobId, input.washerId, input.actorId),
    onSuccess: invalidate,
  });
}

export function useReleaseJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string }) => releaseJob(input.jobId, input.actorId),
    onSuccess: invalidate,
  });
}
