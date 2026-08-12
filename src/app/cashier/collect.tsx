import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoidRequestModal } from '@/components/void-request-modal';
import { PaymentMethodModal } from '@/components/payment-method-modal';
import { ReceiptModal } from '@/components/receipt-modal';
import { PlateBadge } from '@/components/plate-badge';
import { EmptyState } from '@/components/empty-state';
import {
  useCollectibleJobs,
  useCollectionHistory,
  usePayJob,
  useReceiptForJob,
  useReceiptForPayment,
  useRequestVoid,
} from '@/data/queries';
import { SessionHeader } from '@/components/session-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { useSessionStore } from '@/stores/session-store';
import { buildNoticeForJob } from '@/services/customer-notices';
import { logAudit } from '@/services/audit';
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
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <SessionHeader />
      <ErrorBoundary>
        <CollectBody />
      </ErrorBoundary>
    </SafeAreaView>
  );
}

function CollectBody() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: entries, isLoading, isRefetching, refetch: refetchCollectible } = useCollectibleJobs();
  const { data: history, isLoading: historyLoading, isRefetching: historyRefetching, refetch: refetchHistory } = useCollectionHistory();
  const payJob = usePayJob();
  const requestVoid = useRequestVoid();

  const [voidingJobId, setVoidingJobId] = useState<string | null>(null);
  const [payingJobId, setPayingJobId] = useState<string | null>(null);
  const [receiptJobId, setReceiptJobId] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const entriesList = Array.isArray(entries) ? entries : [];
  const historyList = Array.isArray(history) ? history : [];
  const voidingEntry = entriesList.find((entry) => entry.job.id === voidingJobId) ?? null;
  const payingEntry = entriesList.find((entry) => entry.job.id === payingJobId) ?? null;
  const { data: freshReceipt } = useReceiptForJob(receiptJobId);
  const { data: historyReceipt } = useReceiptForPayment(receiptPaymentId);
  const shownReceipt = freshReceipt ?? historyReceipt;
  const receiptBusy = receiptJobId !== null && !freshReceipt;

  const handleCollect = (method: PaymentMethod) => {
    if (!payingJobId) return;
    payJob
      .mutateAsync({ jobId: payingJobId, actorId, method })
      .then(() => setReceiptJobId(payingJobId))
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

  const handleNotifyCustomer = async (jobId: string) => {
    try {
      const notice = await buildNoticeForJob(jobId, 'ready');
      await Share.share({ message: notice.text });
    } catch (error) {
      console.warn('Customer notice failed (non-fatal)', error);
      Alert.alert('Notice failed', error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  const handleOpenDrawer = () => {
    logAudit({
      actorId,
      action: 'cash-drawer-opened',
      entity: 'payment',
      entityId: null,
      details: { at: Date.now() },
    });
    Alert.alert('Drawer opened', 'Recorded in the audit trail.');
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
              <PlateBadge plate={item.vehicle.plateNumber} />
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
              <View className="flex-row items-center gap-3">
                <Text className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPesos(item.payment.amountCents)}
                </Text>
                <Pressable onPress={() => setReceiptPaymentId(item.payment.id)}>
                  <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                    Receipt
                  </Text>
                </Pressable>
              </View>
            </View>
        </View>
      );
    }

    return (
      <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="flex-row items-center justify-between">
          <PlateBadge plate={item.vehicle.plateNumber} size="lg" />
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
            onPress={() => handleNotifyCustomer(item.job.id)}
            className="rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
          >
            <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Notify
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
    <>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-bold text-neutral-900 dark:text-white">Collect</Text>
        <Pressable
          onPress={handleOpenDrawer}
          className="flex-row items-center gap-1.5 rounded-xl border border-brand-200 px-3 py-2 active:bg-brand-50 dark:border-brand-900 dark:active:bg-brand-950"
        >
          <Ionicons name="cash-outline" size={16} color="#0E7490" />
          <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            Open drawer
          </Text>
        </Pressable>
      </View>

      {isLoading || historyLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : entriesList.length === 0 && historyList.length === 0 ? (
        <EmptyState
          icon="cash-outline"
          title="Nothing here yet"
          subtitle="Completed jobs awaiting payment appear here, and paid jobs appear in your history."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) =>
            isHistoryEntry(item) ? `pay-${item.payment.id}` : `job-${item.job.id}`
          }
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
        requireReason
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

      <ReceiptModal
        visible={receiptJobId !== null || receiptPaymentId !== null}
        receipt={shownReceipt}
        busy={receiptBusy}
        onClose={() => {
          setReceiptJobId(null);
          setReceiptPaymentId(null);
        }}
      />
    </>
  );
}
