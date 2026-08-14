import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeader } from '@/components/ui/section-header';
import {
  useCollectibleJobs,
  useDayReport,
  useQueuedCount,
  useWorkingBoard,
} from '@/data/queries';
import { dateKey } from '@/domain/day-close';
import { formatPesos } from '@/utils/money';

const QUICK_ACTIONS = [
  { label: 'New Job Order', href: '/cashier', icon: 'car-sport-outline', tint: '#0891B2' },
  { label: 'New Customer', href: '/manager/customers', icon: 'person-add-outline', tint: '#7C3AED' },
  { label: 'Queue', href: '/cashier/queue', icon: 'list-outline', tint: '#D97706' },
  { label: 'Collect', href: '/cashier/collect', icon: 'cash-outline', tint: '#059669' },
] as const;

export default function DashboardScreen() {
  const router = useRouter();
  const { data: report, isLoading: reportLoading } = useDayReport(dateKey());
  const { data: queuedCount = 0 } = useQueuedCount();
  const { data: board } = useWorkingBoard();
  const { data: collectible = [] } = useCollectibleJobs();

  const activeCount = (board ?? []).filter((entry) =>
    ['assigned', 'in_progress', 'quality_check'].includes(entry.job.status),
  ).length;
  const completedCount = (board ?? []).filter((entry) => entry.job.status === 'completed').length;

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader title="Dashboard" subtitle="Live overview of today's operations." />
        <View className="flex-1 px-5 pb-8">
          {reportLoading ? (
            <ActivityIndicator color="#0891B2" className="py-12" />
          ) : (
            <>
              <View className="mt-5 flex-row gap-3">
                <StatCard
                  label="Today's revenue"
                  value={report ? formatPesos(report.revenueCents) : '₱0.00'}
                  icon="wallet-outline"
                  tint="#059669"
                />
                <StatCard
                  label="Active jobs"
                  value={String(activeCount)}
                  icon="construct-outline"
                  tint="#0891B2"
                />
              </View>
              <View className="mt-3 flex-row gap-3">
                <StatCard
                  label="In queue"
                  value={String(queuedCount)}
                  icon="list-outline"
                  tint="#D97706"
                />
                <StatCard
                  label="Completed"
                  value={String(completedCount)}
                  icon="checkmark-done-outline"
                  tint="#7C3AED"
                />
              </View>

              {collectible.length > 0 ? (
                <Card className="mt-4 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        {collectible.length} vehicle{collectible.length === 1 ? '' : 's'} ready for
                        payment
                      </Text>
                      <Text className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                        Head to Collect to take payment.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push('/cashier/collect')}
                      className="rounded-xl bg-emerald-600 px-3 py-2 active:bg-emerald-700"
                    >
                      <Text className="text-xs font-bold text-white">Collect</Text>
                    </Pressable>
                  </View>
                </Card>
              ) : null}

              {report ? (
                <Card className="mt-4">
                  <Text className="text-base font-bold text-neutral-900 dark:text-white">
                    Today at a glance
                  </Text>
                  <View className="mt-3 gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                        Jobs finished
                      </Text>
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {report.jobCount}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                        Voided jobs
                      </Text>
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {report.voidedCount} · {formatPesos(report.voidedAmountCents)}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                        Expenses
                      </Text>
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatPesos(report.expensesCents)}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-neutral-500 dark:text-neutral-400">No-shows</Text>
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {report.noShowCount}
                      </Text>
                    </View>
                  </View>
                </Card>
              ) : null}

              <SectionHeader title="Quick actions" />
              <View className="flex-row flex-wrap justify-between">
                {QUICK_ACTIONS.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={() => router.push(action.href)}
                    className="mb-3 w-[48%] rounded-3xl border border-neutral-200 bg-white p-4 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${action.tint}1A` }}
                    >
                      <Ionicons name={action.icon} size={22} color={action.tint} />
                    </View>
                    <Text className="mt-3 text-sm font-semibold leading-tight text-neutral-900 dark:text-white">
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </RoleGuard>
  );
}