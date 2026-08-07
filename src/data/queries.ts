import { useQuery } from '@tanstack/react-query';

import { countQueuedJobs, listActiveServices, listQueuedWithDetails, listRecentPlates } from '@/services/checkin';

export const queueKeys = {
  all: ['jobs'] as const,
  queued: ['jobs', 'queued'] as const,
  queuedCount: ['jobs', 'queued', 'count'] as const,
};

export const serviceKeys = {
  active: ['services', 'active'] as const,
};

export const recentPlatesKeys = {
  list: ['recent-plates'] as const,
};

export function useQueuedJobs() {
  return useQuery({
    queryKey: queueKeys.queued,
    queryFn: listQueuedWithDetails,
  });
}

export function useQueuedCount() {
  return useQuery({
    queryKey: queueKeys.queuedCount,
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
