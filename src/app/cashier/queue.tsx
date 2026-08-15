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
import { JobNotesModal } from '@/components/job-notes-modal';
import { PlateBadge } from '@/components/plate-badge';
import { EmptyState } from '@/components/empty-state';
import {
  useForceAssign,
  useMoveQueuedJob,
  useQueuedJobs,
  useSetJobNotes,
  useVoidJob,
} from '@/data/queries';
import { ScreenHeader } from '@/components/screen-header';
import { WasherPicker } from '@/components/washer-picker';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

export default function CashierQueueScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: entries, isLoading, isRefetching, refetch } = useQueuedJobs();
  const voidJob = useVoidJob();
  const setNotes = useSetJobNotes();
  const moveJob = useMoveQueuedJob();
  const forceAssign = useForceAssign();

  const [voidingJobId, setVoidingJobId] = useState<string | null>(null);
  const [notesJobId, setNotesJobId] = useState<string | null>(null);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
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
  const notesEntry = queued.find((entry) => entry.job.id === notesJobId) ?? null;
  const assigningEntry = queued.find((entry) => entry.job.id === assigningJobId) ?? null;

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

  const handleAssign = (washerId: string) => {
    if (!assigningJobId) return;
    setAssigningJobId(null);
    forceAssign
      .mutateAsync({ jobId: assigningJobId, washerId, actorId })
      .then(() => Alert.alert('Done', 'Job assigned to washer.'))
      .catch((error) =>
        Alert.alert('Assign failed', error instanceof Error ? error.message : 'Something went wrong.'),
      );
  };

  const handleSaveNotes = (notes: string) => {
    if (!notesJobId) return;
    setNotes
      .mutateAsync({ jobId: notesJobId, notes, actorId })
      .then(() => Alert.alert('Done', 'Job notes saved.'))
      .catch((error) =>
        Alert.alert('Save failed', error instanceof Error ? error.message : 'Something went wrong.'),
      )
      .finally(() => setNotesJobId(null));
  };

  const handleMove = (jobId: string, direction: 'up' | 'down') => {
    moveJob.mutateAsync({ jobId, direction, actorId }).catch((error) => {
      Alert.alert('Move failed', error instanceof Error ? error.message : 'Something went wrong.');
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <ScreenHeader title={`Queue · ${queued.length}`} />

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
                <Pressable
                  onPress={() => handleMove(item.job.id, 'up')}
                  disabled={index === 0 || moveJob.isPending}
                  hitSlop={8}
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full active:bg-neutral-200 disabled:opacity-30 dark:active:bg-neutral-800"
                >
                  <Ionicons name="chevron-up" size={18} color="#0891B2" />
                </Pressable>
                <Pressable
                  onPress={() => handleMove(item.job.id, 'down')}
                  disabled={index === filtered.length - 1 || moveJob.isPending}
                  hitSlop={8}
                  className="flex h-9 w-9 items-center justify-center rounded-full active:bg-neutral-200 disabled:opacity-30 dark:active:bg-neutral-800"
                >
                  <Ionicons name="chevron-down" size={18} color="#0891B2" />
                </Pressable>
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
                {item.job.notes ? (
                  <View className="mt-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950">
                    <Text className="text-xs text-amber-800 dark:text-amber-200">
                      {item.job.notes}
                    </Text>
                  </View>
                ) : null}
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => setAssigningJobId(item.job.id)}
                    disabled={forceAssign.isPending}
                    className="self-start rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 active:bg-brand-100 dark:border-brand-900 dark:bg-brand-950 dark:active:bg-brand-900"
                  >
                    <Text className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                      Assign
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setNotesJobId(item.job.id)}
                    className="self-start rounded-lg border border-neutral-200 px-3 py-1.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                  >
                    <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                      {item.job.notes ? 'Edit note' : 'Add note'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setVoidingJobId(item.job.id)}
                    className="self-start rounded-lg border border-red-200 px-3 py-1.5 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
                  >
                    <Text className="text-xs font-semibold text-red-600 dark:text-red-400">Void</Text>
                  </Pressable>
                </View>
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

      <JobNotesModal
        key={notesEntry?.job.id ?? 'closed'}
        visible={notesEntry !== null}
        title={`Notes · ${notesEntry?.vehicle.plateNumber ?? ''}`}
        initialNotes={notesEntry?.job.notes ?? null}
        busy={setNotes.isPending}
        onClose={() => setNotesJobId(null)}
        onSave={handleSaveNotes}
      />

      <WasherPicker
        visible={assigningEntry !== null}
        title="Assign to washer"
        subtitle={
          assigningEntry
            ? `${assigningEntry.vehicle.plateNumber} · ${assigningEntry.service?.name ?? 'Service'}`
            : undefined
        }
        onClose={() => setAssigningJobId(null)}
        onPick={handleAssign}
      />
    </SafeAreaView>
  );
}
