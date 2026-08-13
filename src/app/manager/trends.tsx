import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { RoleGuard } from '@/components/role-guard';
import { MethodBreakdown, StatRow } from '@/components/report-rows';
import { SessionHeader } from '@/components/session-header';
import {
  useMonthlyEmployeePerformance,
  useMonthlyReport,
} from '@/data/queries';
import { formatMonth, monthKey, shiftMonth } from '@/domain/monthly';
import { formatPesos } from '@/utils/money';


export default function ManagerTrends() {
  const [month, setMonth] = useState(() => monthKey());
  const { data: report, isLoading } = useMonthlyReport(month);
  const { data: performance = [], isLoading: performanceLoading } =
    useMonthlyEmployeePerformance(month);

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Monthly trends</Text>

          <View className="mt-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setMonth((m) => shiftMonth(m, -1))}
              className="rounded-xl border border-neutral-300 p-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
            >
              <Ionicons name="chevron-back" size={20} color="#0891B2" />
            </Pressable>
            <Text className="text-base font-bold text-neutral-900 dark:text-white">
              {formatMonth(month)}
            </Text>
            <Pressable
              onPress={() => setMonth((m) => shiftMonth(m, 1))}
              className="rounded-xl border border-neutral-300 p-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
            >
              <Ionicons name="chevron-forward" size={20} color="#0891B2" />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#0891B2" className="py-10" />
          ) : report ? (
            <>
              <View className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <Text className="mb-1 text-lg font-bold text-neutral-900 dark:text-white">Summary</Text>
                <StatRow label="Jobs finished" value={String(report.jobCount)} />
                <StatRow label="Revenue" value={formatPesos(report.revenueCents)} />
                <MethodBreakdown breakdown={report.revenueByMethodCents} />
                <StatRow
                  label="Voids"
                  value={`${report.voidedCount} · ${formatPesos(report.voidedAmountCents)}`}
                />
                <StatRow label="No-shows" value={String(report.noShowCount)} />
                <StatRow label="Expenses" value={formatPesos(report.expensesCents)} />
                <View className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" />
                <StatRow
                  label="Net"
                  value={formatPesos(report.netCents)}
                  negative={report.netCents < 0}
                />
              </View>

              <View className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <Text className="mb-1 text-lg font-bold text-neutral-900 dark:text-white">
                  Activity
                </Text>
                <StatRow label="Days with activity" value={String(report.activeDayCount)} />
                <StatRow
                  label="Avg revenue / active day"
                  value={formatPesos(report.avgRevenuePerDayCents)}
                />
                <StatRow label="Days closed" value={String(report.closedDayCount)} />
              </View>
            </>
          ) : (
            <Text className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No data for this month.
            </Text>
          )}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Team performance · {formatMonth(month)}
          </Text>
          {performanceLoading ? (
            <ActivityIndicator color="#0891B2" className="py-6" />
          ) : performance.length === 0 ? (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              No completed jobs this month.
            </Text>
          ) : (
            performance.map((washer) => (
              <View
                key={washer.washerId}
                className="mb-2 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                  {washer.washerName ?? 'Washer'}
                </Text>
                <View className="items-end">
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {washer.completedCount} done
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatPesos(washer.revenueCents)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}
