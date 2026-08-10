import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoidRequestModal } from '@/components/void-request-modal';
import { PaymentMethodModal } from '@/components/payment-method-modal';
import { useCollectibleJobs, useCollectionHistory, usePayJob, useRequestVoid } from '@/data/queries';
import { SessionHeader } from '@/components/session-header';
import { useSessionStore } from '@/stores/session-store';
import type { QueueEntry } from '@/data/repositories';
import type { CollectionHistoryEntry } from '@/services/payments';
import type { PaymentMethod } from '@/domain/payment';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

type CollectEntry = QueueEntry | CollectionHistoryEntry;

function isHistoryEntry(entry: CollectEntry): entry is CollectionHistoryEntry {
  return 'payment' in entry;
}

export default function CashierCollectScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: entries, isLoading, isRefetching, refetch: refetchCollectible } = useCollectibleJobs();
  const { data: history, isLoading: historyLoading, isRefetching: historyRefetching, refetch: refetchHistory } = useCollectionHistory();
  const payJob = usePayJob();
  const requestVoid = useRequestVoid();

  const [voidingJobId, setVoidingJobId] = useState<string | null>(null);
  const [payingJobId, setPayingJobId] = useState<string | null>(null);
  const entriesList = entries ?? [];
  const historyList = history ?? [];
  const voidingEntry = entriesList.find((entry) => entry.job.id === voidingJobId) ?? null;
  const payingEntry = entriesList.find((entry) => entry.job.id === payingJobId) ?? null;

  const handleCollect = (method: PaymentMethod) => {
    if (!payingJobId) return;
    payJob
      .mutateAsync({ jobId: payingJobId, actorId, method })
      .then(() => Alert.alert('Payment received', `Job marked as paid via ${method}.`))
      .catch((error) =>
        Alert.alert('Payment failed', error instanceof Error ? error.message : 'Something went wrong.'),
      )
      .finally(() => setPayingJobId(null));
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

  const sections = [
    { title: `Ready to collect · ${entriesList.length}`, data: entriesList as CollectEntry[] },
    { title: `Collection history · ${historyList.length}`, data: historyList as CollectEntry[] },
  ];

  const renderEntry = ({ item }: { item: CollectEntry }) => {
    if (isHistoryEntry(item)) {
      return (
        <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-bold tracking-widest text-neutral-900 dark:text-white">
                {item.vehicle.plateNumber}
              </Text>
              <View className="rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-950">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Paid
                </Text>
              </View>
            </View>
            <Text className="text-sm text-neutral-400 dark:text-neutral-500">
              {formatClockTime(item.payment.paidAt)}
            </Text>
          </View>
          <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {item.customer.name}
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {item.service?.name ?? 'Service'}
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                {item.receivedByName ? `Collected by ${item.receivedByName}` : 'Collected'}
              </Text>
              <View className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                  {item.payment.method}
                </Text>
              </View>
            </View>
            <Text className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatPesos(item.payment.amountCents)}
            </Text>
          </View>
        </View>
      );
    }

    return (
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
            onPress={() => setPayingJobId(item.job.id)}
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
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <SessionHeader />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-bold text-neutral-900 dark:text-white">Collect</Text>
      </View>

      {isLoading || historyLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : entriesList.length === 0 && historyList.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Nothing here yet
          </Text>
          <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
            Completed jobs awaiting payment appear here, and paid jobs appear in your history.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.job.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || historyRefetching}
              onRefresh={() => {
                refetchCollectible();
                refetchHistory();
              }}
              tintColor="#0891B2"
            />
          }
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderSectionHeader={({ section }) => (
            <View className="px-1 pb-1 pt-2">
              <Text className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {section.title}
              </Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          renderItem={renderEntry}
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

      <PaymentMethodModal
        visible={payingEntry !== null}
        amountCents={payingEntry?.job.priceCents ?? 0}
        busy={payJob.isPending}
        onClose={() => setPayingJobId(null)}
        onConfirm={handleCollect}
      />
    </SafeAreaView>
  );
}
