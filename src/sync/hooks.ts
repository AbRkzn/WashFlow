import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { hydrateMissingPhotos, processPhotoUploads } from '@/services/photo-upload';
import { useSessionStore } from '@/stores/session-store';
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

/**
 * Auto-syncs on an interval while a session is active. Runs are single-flight
 * (the engine's `running` guard skips overlapping calls), so it is safe to
 * call on a timer even when offline or mid-sync. Invalidates queries whenever
 * data moved so boards reflect pulled changes.
 */
export function useAutoSync(intervalMs = 20_000) {
  const queryClient = useQueryClient();
  const signedIn = useSessionStore((s) => s.status === 'authenticated');

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (!active) return;
      try {
        const result = await runSync();
        if (result.pushed > 0 || result.pulled > 0) {
          queryClient.invalidateQueries();
        }
        queryClient.invalidateQueries({ queryKey: syncKeys.status });
        processPhotoUploads().catch((error) =>
          console.warn('Photo upload pass failed (non-fatal)', error),
        );
        hydrateMissingPhotos().catch((error) =>
          console.warn('Photo hydration failed (non-fatal)', error),
        );
      } catch (error) {
        console.warn('Auto sync failed (non-fatal)', error);
        queryClient.invalidateQueries({ queryKey: syncKeys.status });
      }
    };

    timer = setTimeout(tick, intervalMs);
    const interval = setInterval(tick, intervalMs);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      clearInterval(interval);
    };
  }, [signedIn, intervalMs, queryClient]);
}
