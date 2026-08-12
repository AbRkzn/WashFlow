import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useRunSync, useSyncStatus } from '@/sync/hooks';
import { formatClockTime } from '@/utils/time';

export function SyncStatusBar() {
  const { data } = useSyncStatus();
  const runSync = useRunSync();

  if (!data) {
    return null;
  }

  const syncing = runSync.isPending || data.running;
  const lastSynced = data.lastSyncedAt > 0 ? formatClockTime(data.lastSyncedAt) : 'never';
  const offline = data.pending > 0 && data.lastError !== null;

  return (
    <View className="mx-4 mb-1.5 flex-row items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-2 pr-1.5 dark:border-neutral-800 dark:bg-neutral-900">
      {syncing ? (
        <ActivityIndicator size="small" color="#0891B2" />
      ) : offline ? (
        <View className="rounded-full bg-amber-100 p-1.5 dark:bg-amber-950">
          <Ionicons name="cloud-offline-outline" size={14} color="#D97706" />
        </View>
      ) : data.pending > 0 ? (
        <View className="rounded-full bg-brand-100 p-1.5 dark:bg-brand-950">
          <Ionicons name="cloud-upload-outline" size={14} color="#0891B2" />
        </View>
      ) : (
        <View className="rounded-full bg-green-100 p-1.5 dark:bg-green-950">
          <Ionicons name="cloud-done-outline" size={14} color="#16A34A" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-[11px] font-semibold text-neutral-900 dark:text-white">
          {data.pending > 0 ? `${data.pending} change${data.pending === 1 ? '' : 's'} pending` : 'All changes synced'}
        </Text>
        <Text className="text-[10px] text-neutral-400 dark:text-neutral-500">
          Last sync {lastSynced}
        </Text>
      </View>
      <Pressable
        onPress={() => runSync.mutate()}
        disabled={syncing}
        className="rounded-full bg-brand-600 px-3 py-1.5 active:bg-brand-700 disabled:opacity-50"
      >
        <Text className="text-[11px] font-semibold text-white">{syncing ? 'Syncing…' : 'Sync now'}</Text>
      </Pressable>
    </View>
  );
}
