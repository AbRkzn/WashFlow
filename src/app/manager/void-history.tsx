import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import { PlateBadge } from '@/components/plate-badge';
import { useVoidHistory } from '@/data/queries';
import type { VoidHistoryEntry } from '@/services/payments';
import { VOID_REQUEST_STATUS_LABELS, type VoidRequestStatus } from '@/domain/payment';
import { formatPesos } from '@/utils/money';
import { formatDateTime } from '@/utils/time';

const STATUS_CHIP: Record<VoidRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  approved: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  rejected: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
};

function VoidCard({ entry }: { entry: VoidHistoryEntry }) {
  return (
    <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-center justify-between">
        <PlateBadge plate={entry.vehicle.plateNumber} size="lg" />
        <View className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
          <Text className={`text-xs font-semibold ${STATUS_CHIP[entry.request.status]}`}>
            {VOID_REQUEST_STATUS_LABELS[entry.request.status]}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">
        {entry.customer.name} · {entry.service?.name ?? 'Service'} ·{' '}
        {formatPesos(entry.service?.priceCents ?? entry.job.priceCents)}
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        {formatDateTime(entry.request.createdAt)}
      </Text>
      <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Requested by {entry.requesterName ?? 'staff'}
        {entry.request.resolvedBy && entry.request.status !== 'pending'
          ? ` · Resolved by ${entry.resolverName ?? 'staff'}`
          : ''}
      </Text>
      {entry.request.reason ? (
        <Text className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {entry.request.reason}
        </Text>
      ) : null}
    </View>
  );
}

export default function ManagerVoidHistory() {
  const { data: entries, isLoading } = useVoidHistory();

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader title="Void history" />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {isLoading ? (
            <ActivityIndicator color="#0891B2" className="py-10" />
          ) : entries && entries.length > 0 ? (
            <View className="mt-4">
              {entries.map((entry) => (
                <VoidCard key={entry.request.id} entry={entry} />
              ))}
            </View>
          ) : (
            <View className="mt-16 items-center">
              <Ionicons name="trash-outline" size={40} color="#A3A3A3" />
              <Text className="mt-3 text-lg font-bold text-neutral-900 dark:text-white">
                No voids yet
              </Text>
              <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Voided jobs and void requests will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}