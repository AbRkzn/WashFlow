import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSyncSummary, runSync } from '@/sync/engine';

export const syncKeys = {
  status: ['sync', 'status'] as const,
};

export function useSyncStatus() {
  return useQuery({
    queryKey: syncKeys.status,
    queryFn: getSyncSummary,
    refetchInterval: 10_000,
  });
}

export function useRunSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runSync,
    onSuccess: (result) => {
      if (result.pushed > 0 || result.pulled > 0) {
        queryClient.invalidateQueries();
      }
      queryClient.invalidateQueries({ queryKey: syncKeys.status });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: syncKeys.status });
    },
  });
}
