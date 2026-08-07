import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoidRequestModal } from '@/components/void-request-modal';
import { useCollectibleJobs, usePayJob, useRequestVoid } from '@/data/queries';
import { SessionHeader } from '@/components/session-header';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

export default function CashierCollectScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: entries, isLoading, isRefetching, refetch } = useCollectibleJobs();
  const payJob = usePayJob();
  const requestVoid = useRequestVoid();

  const [voidingJobId, setVoidingJobId] = useState<string | null>(null);
  const entriesList = entries ?? [];
  const voidingEntry = entriesList.find((entry) => entry.job.id === voidingJobId) ?? null;

  const handleCollect = (jobId: string) => {
    payJob
      .mutateAsync({ jobId, actorId })
      .then(() => Alert.alert('Payment received', 'Job marked as paid.'))
      .catch((error) =>
        Alert.alert('Payment failed', error instanceof Error ? error.message : 'Something went wrong.'),
      );
  };

  const handleRequestVoid = (reason: string) => {
    if (!voidingJobId) return;
    requestVoid
      .mutateAsync({ jobId: voidingJobId, actorId, reason })
      .then(() => Alert.alert('Request sent', 'Manager approval is required to void this job.'))
      .catch((error) =>
        Alert.alert('Void request failed', error instanceof Error ? error.message : 'Something went wrong.'),
      )
      .finally(() => setVoidingJobId(null));
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <SessionHeader />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-bold text-neutral-900 dark:text-white">
          Ready to collect · {entriesList.length}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : entriesList.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Nothing to collect
          </Text>
          <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
            Completed jobs awaiting payment appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entriesList}
          keyExtractor={(entry) => entry.job.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
          }
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
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
              </Text>
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  onPress={() => handleCollect(item.job.id)}
                  disabled={payJob.isPending}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-50"
                >
                  <Text className="text-sm font-semibold text-white">
                    Collect · {formatPesos(item.job.priceCents)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setVoidingJobId(item.job.id)}
                  disabled={requestVoid.isPending}
                  className="rounded-xl border border-red-200 px-4 py-3 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
                >
                  <Text className="text-sm font-semibold text-red-600 dark:text-red-400">Void</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <VoidRequestModal
        visible={voidingEntry !== null}
        title="Request void approval"
        plateNumber={voidingEntry?.vehicle.plateNumber ?? ''}
        busy={requestVoid.isPending}
        onClose={() => setVoidingJobId(null)}
        onConfirm={handleRequestVoid}
      />
    </SafeAreaView>
  );
}
