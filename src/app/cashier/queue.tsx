import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useQueuedJobs } from '@/data/queries';
import { SessionHeader } from '@/components/session-header';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

export default function CashierQueueScreen() {
  const { data: entries, isLoading, isRefetching, refetch } = useQueuedJobs();

  const queued = useMemo(() => entries ?? [], [entries]);

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
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
