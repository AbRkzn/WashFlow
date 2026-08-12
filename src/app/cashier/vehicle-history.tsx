import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionHeader } from '@/components/session-header';
import { useVehicleHistory } from '@/data/queries';
import type { VehicleHistoryEntry } from '@/data/repositories';
import { JOB_STATUS_LABELS, type JobStatus } from '@/domain/job';
import { PAYMENT_METHOD_LABELS } from '@/domain/payment';
import { formatPesos } from '@/utils/money';
import { formatDateTime } from '@/utils/time';

const STATUS_CHIP: Record<JobStatus, string> = {
  queued: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  assigned: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  quality_check: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  voided: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

function HistoryCard({ entry }: { entry: VehicleHistoryEntry }) {
  const paid = entry.payment && !entry.payment.voidedAt;
  return (
    <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          {formatDateTime(entry.job.createdAt)}
        </Text>
        <View className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
          <Text className={`text-xs font-semibold ${STATUS_CHIP[entry.job.status]}`}>
            {JOB_STATUS_LABELS[entry.job.status]}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
        {entry.service?.name ?? 'Service'}
      </Text>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          {paid ? `${PAYMENT_METHOD_LABELS[entry.payment!.method]} · ${formatPesos(entry.payment!.amountCents)}` : '—'}
        </Text>
        <Text className="text-sm font-bold text-neutral-900 dark:text-white">
          {formatPesos(entry.job.priceCents)}
        </Text>
      </View>
    </View>
  );
}

export default function VehicleHistoryScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string | string[] }>();
  const vehicleId = typeof params.vehicleId === 'string' ? params.vehicleId : '';

  const { data: entries, isLoading } = useVehicleHistory(vehicleId);
  const list = entries ?? [];

  const totalSpentCents = list
    .filter((entry) => entry.payment && !entry.payment.voidedAt)
    .reduce((sum, entry) => sum + (entry.payment?.amountCents ?? 0), 0);
  const first = list[0];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <SessionHeader />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View className="flex-row items-center gap-3">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Vehicle history</Text>
        </View>

        {isLoading ? (
          <View className="py-10">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : (
          <>
            {first ? (
              <View className="rounded-2xl border border-brand-200 bg-white p-4 dark:border-brand-900 dark:bg-neutral-900">
                <Text className="text-xl font-bold tracking-widest text-neutral-900 dark:text-white">
                  {first.vehicle.plateNumber}
                </Text>
                <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {first.customer.name}
                  {first.customer.phone ? ` · ${first.customer.phone}` : ''}
                </Text>
                <View className="mt-3 flex-row gap-2">
                  <View className="flex-1 rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400">Visits</Text>
                    <Text className="text-lg font-bold text-neutral-900 dark:text-white">{list.length}</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400">Total spent</Text>
                    <Text className="text-lg font-bold text-neutral-900 dark:text-white">
                      {formatPesos(totalSpentCents)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {list.length === 0 ? (
              <View className="items-center justify-center px-8 py-16">
                <Text className="text-2xl font-bold text-neutral-900 dark:text-white">No visits yet</Text>
                <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
                  Check in this plate to start its history.
                </Text>
              </View>
            ) : (
              list.map((entry) => <HistoryCard key={entry.job.id} entry={entry} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
