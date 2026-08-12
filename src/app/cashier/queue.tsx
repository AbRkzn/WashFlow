import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoidRequestModal } from '@/components/void-request-modal';
import { PlateBadge } from '@/components/plate-badge';
import { EmptyState } from '@/components/empty-state';
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
  const [query, setQuery] = useState('');
  const queued = useMemo(() => entries ?? [], [entries]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return queued;
    }
    return queued.filter(
      (entry) =>
        entry.vehicle.plateNumber.toLowerCase().includes(term) ||
        entry.customer.name.toLowerCase().includes(term),
    );
  }, [queued, query]);

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

      <View className="px-4 pb-2">
        <View className="flex-row items-center rounded-2xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900">
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search plate or name"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
            className="flex-1 px-2 py-3 text-base text-neutral-900 dark:text-white"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} className="p-1">
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : queued.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          title="Queue is clear"
          subtitle="New check-ins will appear here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          subtitle={`No queued job matches "${query.trim()}".`}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(entry) => entry.job.id}
          keyboardShouldPersistTaps="handled"
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
                  <PlateBadge plate={item.vehicle.plateNumber} />
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
