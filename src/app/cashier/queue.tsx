import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoidRequestModal } from '@/components/void-request-modal';
import { useQueuedJobs, useVoidJob } from '@/data/queries';
import { SessionHeader } from '@/components/session-header';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

export default function CashierQueueScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: entries, isLoading, isRefetching, refetch } = useQueuedJobs();
  const voidJob = useVoidJob();

  const [voidingJobId, setVoidingJobId] = useState<string | null>(null);
  const queued = useMemo(() => entries ?? [], [entries]);

  const voidingEntry = queued.find((entry) => entry.job.id === voidingJobId) ?? null;

  const handleVoid = (reason: string) => {
    if (!voidingJobId) return;
    voidJob
      .mutateAsync({ jobId: voidingJobId, actorId, reason })
      .then(() => Alert.alert('Done', 'Job voided.'))
      .catch((error) =>
        Alert.alert('Void failed', error instanceof Error ? error.message : 'Something went wrong.'),
      )
      .finally(() => setVoidingJobId(null));
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <SessionHeader />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-bold text-neutral-900 dark:text-white">
          Queue · {queued.length}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : queued.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Queue is clear</Text>
          <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
            New check-ins will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={queued}
          keyExtractor={(entry) => entry.job.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
          }
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item, index }) => (
            <View className="flex-row rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <View className="mr-4 items-center justify-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950">
                  <Text className="text-base font-bold text-brand-700 dark:text-brand-300">
                    {index + 1}
                  </Text>
                </View>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-bold tracking-widest text-neutral-900 dark:text-white">
                    {item.vehicle.plateNumber}
                  </Text>
                  <Text className="text-sm text-neutral-400 dark:text-neutral-500">
                    {formatClockTime(item.job.createdAt)}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {item.customer.name}
                </Text>
                <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {item.service?.name ?? 'Service'}
                  {item.service ? ` · ${formatPesos(item.service.priceCents)}` : ''}
                </Text>
                <Pressable
                  onPress={() => setVoidingJobId(item.job.id)}
                  className="mt-3 self-start rounded-lg border border-red-200 px-3 py-1.5 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
                >
                  <Text className="text-xs font-semibold text-red-600 dark:text-red-400">Void</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <VoidRequestModal
        visible={voidingEntry !== null}
        title="Void queued job"
        plateNumber={voidingEntry?.vehicle.plateNumber ?? ''}
        busy={voidJob.isPending}
        onClose={() => setVoidingJobId(null)}
        onConfirm={handleVoid}
      />
    </SafeAreaView>
  );
}
