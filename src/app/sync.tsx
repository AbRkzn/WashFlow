import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { usePendingSyncEntries } from '@/data/queries';
import { useRunSync, useSyncStatus } from '@/sync/hooks';
import { formatClockTime } from '@/utils/time';

const OP_LABELS: Record<string, string> = {
  upsert: 'Create / update',
  delete: 'Delete',
};

export default function OfflineSyncScreen() {
  const { data: status } = useSyncStatus();
  const { data: pending } = usePendingSyncEntries();
  const runSync = useRunSync();

  const syncing = runSync.isPending || status?.running === true;
  const lastSynced = status && status.lastSyncedAt > 0 ? formatClockTime(status.lastSyncedAt) : 'Never';
  const offline = status ? status.pending > 0 && status.lastError !== null : false;
  const pendingCount = status?.pending ?? 0;
  const lastPulledSeq = status?.lastPulledSeq ?? 0;

  return (
    <RoleGuard roles={['admin', 'manager', 'cashier', 'washer']}>
      <Screen>
        <View className="flex-row items-center gap-3">
          <BackButton />
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Offline sync
          </Text>
        </View>

        <Card className="mt-4 items-center gap-2 py-6">
          {syncing ? (
            <ActivityIndicator size="large" color="#0891B2" />
          ) : offline ? (
            <View className="rounded-full bg-amber-100 p-4 dark:bg-amber-950">
              <Ionicons name="cloud-offline-outline" size={32} color="#D97706" />
            </View>
          ) : pendingCount > 0 ? (
            <View className="rounded-full bg-brand-100 p-4 dark:bg-brand-950">
              <Ionicons name="cloud-upload-outline" size={32} color="#0891B2" />
            </View>
          ) : (
            <View className="rounded-full bg-green-100 p-4 dark:bg-green-950">
              <Ionicons name="cloud-done-outline" size={32} color="#16A34A" />
            </View>
          )}
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">
            {syncing
              ? 'Syncing changes…'
              : offline
                ? 'Working offline'
                : pendingCount > 0
                  ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`
                  : 'Everything is in sync'}
          </Text>
          <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            {syncing
              ? 'Your device stays fully usable while it uploads and pulls changes.'
              : offline
                ? 'No connection right now. Changes are stored safely on this device and upload automatically when you reconnect.'
                : `Last synced ${lastSynced} · server sequence ${lastPulledSeq}`}
          </Text>
          <View className="mt-2 w-full">
            <Button
              label={syncing ? 'Syncing…' : 'Sync now'}
              icon={syncing ? undefined : 'sync'}
              onPress={() => runSync.mutate()}
              disabled={syncing}
              loading={syncing}
            />
          </View>
        </Card>

        {status?.lastError ? (
          <Card className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <Text className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Last error
            </Text>
            <Text className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              {status.lastError}
            </Text>
          </Card>
        ) : null}

        <SectionHeader title={`Pending changes · ${pending?.length ?? 0}`} />
        {pending && pending.length > 0 ? (
          (pending ?? []).map((entry) => (
            <Card key={entry.id} className="mb-2 flex-row items-center gap-3">
              <View className="rounded-xl bg-brand-100 p-2 dark:bg-brand-950">
                <Ionicons name="document-text-outline" size={18} color="#0891B2" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  {entry.entityLabel}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                  {OP_LABELS[entry.op] ?? entry.op} · {entry.entityId.slice(0, 12)}…
                </Text>
                {entry.lastError ? (
                  <Text className="mt-0.5 text-xs text-red-500 dark:text-red-400">
                    {entry.lastError}
                  </Text>
                ) : null}
              </View>
              {entry.attemptCount > 0 ? (
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                  {entry.attemptCount}× retried
                </Text>
              ) : null}
            </Card>
          ))
        ) : (
          <Text className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
            Nothing waiting. New changes appear here the moment you work offline.
          </Text>
        )}

        <SectionHeader title="How offline sync works" />
        <Card>
          {[
            'Every change is recorded on this device first, so you can work with no connection for days.',
            'The queue retries automatically with backoff — nothing is lost while offline.',
            'On reconnect, the server assigns each change a sequence; your device then pulls everything newer.',
            'Payments, voids and price edits that conflict are kept for manager review — nothing is silently overwritten.',
          ].map((line, index) => (
            <View key={index} className="mb-2 flex-row items-start gap-2 last:mb-0">
              <Ionicons name="checkmark-circle-outline" size={18} color="#0891B2" />
              <Text className="flex-1 text-sm text-neutral-600 dark:text-neutral-300">
                {line}
              </Text>
            </View>
          ))}
        </Card>
      </Screen>
    </RoleGuard>
  );
}