import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PhotoKind } from '@/data/schema';
import { addJobPhoto, listJobPhotos } from '@/services/photos';
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
import {
  approveVoidRequest,
  listCollectibleJobs,
  listPendingVoidRequests,
  payJob,
  rejectVoidRequest,
  requestVoid,
  voidJob,
} from '@/services/payments';
import {
  bookAppointment,
  cancelAppointment,
  checkInAppointment,
  listDaySlots,
} from '@/services/appointments';
import { getSchedule } from '@/services/settings';

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

export const photoKeys = {
  all: ['photos'] as const,
  job: (jobId: string) => ['photos', 'job', jobId] as const,
};

export const paymentKeys = {
  collectible: ['payments', 'collectible'] as const,
};

export const voidRequestKeys = {
  all: ['void-requests'] as const,
  pending: ['void-requests', 'pending'] as const,
};

export const appointmentKeys = {
  all: ['appointments'] as const,
  day: (date: string) => ['appointments', 'day', date] as const,
};

export const scheduleKeys = {
  current: ['schedule', 'current'] as const,
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

export function useJobPhotos(jobId: string) {
  return useQuery({
    queryKey: photoKeys.job(jobId),
    queryFn: () => listJobPhotos(jobId),
    enabled: Boolean(jobId),
  });
}

export function useAddJobPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; kind: PhotoKind; uri: string }) =>
      addJobPhoto(input.jobId, input.kind, input.uri),
    onSuccess: (_photo, vars) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.job(vars.jobId) });
    },
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

export function useCollectibleJobs() {
  return useQuery({
    queryKey: paymentKeys.collectible,
    queryFn: listCollectibleJobs,
  });
}

export function usePayJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string }) =>
      payJob(input.jobId, input.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.collectible });
    },
  });
}

export function useVoidJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string; reason?: string }) =>
      voidJob(input.jobId, input.actorId, input.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.collectible });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
    },
  });
}

export function useRequestVoid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobId: string; actorId: string; reason?: string }) =>
      requestVoid(input.jobId, input.actorId, input.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
    },
  });
}

export function usePendingVoidRequests() {
  return useQuery({
    queryKey: voidRequestKeys.pending,
    queryFn: listPendingVoidRequests,
  });
}

export function useApproveVoidRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; managerId: string }) =>
      approveVoidRequest(input.requestId, input.managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
    },
  });
}

export function useRejectVoidRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; managerId: string }) =>
      rejectVoidRequest(input.requestId, input.managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.pending });
    },
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: scheduleKeys.current,
    queryFn: getSchedule,
  });
}

export function useDaySlots(date: string) {
  return useQuery({
    queryKey: appointmentKeys.day(date),
    queryFn: () => listDaySlots(date),
    enabled: Boolean(date),
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof bookAppointment>[0]) => bookAppointment(input),
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.day(vars.date) });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { appointmentId: string; date: string; actorId: string }) =>
      cancelAppointment(input.appointmentId, input.actorId),
    onSuccess: (_void, vars) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.day(vars.date) });
    },
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { appointmentId: string; date: string; actorId: string }) =>
      checkInAppointment(input.appointmentId, input.actorId),
    onSuccess: (_appointment, vars) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.day(vars.date) });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.queuedCount });
    },
  });
}
