import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { MethodBreakdown, parseMethodBreakdown, StatRow } from '@/components/report-rows';
import { SessionHeader } from '@/components/session-header';
import {
  useCloseDay,
  useDayClose,
  useDayReport,
  useEmployeePerformance,
} from '@/data/queries';
import { dateKey, formatDay, varianceCents } from '@/domain/day-close';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

export default function ManagerDayClose() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const today = dateKey();
  const { data: close, isLoading: closeLoading } = useDayClose(today);
  const { data: report } = useDayReport(today);
  const { data: performance = [] } = useEmployeePerformance(today);
  const closeDay = useCloseDay();

  const [declaredInput, setDeclaredInput] = useState('');
  const [notes, setNotes] = useState('');

  const declaredCents = (() => {
    const pesos = Number.parseFloat(declaredInput);
    return Number.isFinite(pesos) ? Math.round(pesos * 100) : 0;
  })();
  const expected = report?.expectedCashCents ?? 0;
  const variance = varianceCents(declaredCents, expected);

  const onCloseDay = () => {
    Alert.alert(
      'Close today?',
      'This records today\'s report and is final until an admin reopens the day.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close day',
          style: 'destructive',
          onPress: () =>
            closeDay
              .mutateAsync({ declaredCashCents: declaredCents, notes: notes.trim() || undefined, managerId: actorId })
              .then(() => Alert.alert('Done', 'Day closed. Report saved.'))
              .catch((error) =>
                Alert.alert('Close failed', error instanceof Error ? error.message : 'Something went wrong.'),
              ),
        },
      ],
    );
  };

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Day Close</Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{formatDay(today)}</Text>

          {closeLoading ? (
            <ActivityIndicator color="#0891B2" className="py-10" />
          ) : close ? (
            <>
              <View className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-neutral-900 dark:text-white">Closed report</Text>
                  <View className="rounded-full bg-brand-100 px-3 py-1 dark:bg-brand-900">
                    <Text className="text-xs font-bold text-brand-800 dark:text-brand-200">CLOSED</Text>
                  </View>
                </View>
                <StatRow label="Jobs finished" value={String(close.jobCount)} />
                <StatRow label="Revenue" value={formatPesos(close.revenueCents)} />
                <MethodBreakdown breakdown={parseMethodBreakdown(close.revenueByMethodCents)} showTotal />
                <StatRow label="Voids" value={`${close.voidedCount} · ${formatPesos(close.voidedAmountCents)}`} />
                <StatRow label="Expenses" value={formatPesos(close.expensesCents)} />
                <View className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" />
                <StatRow label="Expected cash" value={formatPesos(close.expectedCashCents)} />
                <StatRow label="Declared cash" value={formatPesos(close.declaredCashCents)} />
                <StatRow
                  label="Variance"
                  value={`${close.varianceCents >= 0 ? '+' : ''}${formatPesos(close.varianceCents)}`}
                  negative={close.varianceCents < 0}
                />
                <Text className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                  Closed {formatClockTime(close.closedAt)}
                </Text>
                {close.notes ? (
                  <Text className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {close.notes}
                  </Text>
                ) : null}
              </View>

              <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Team performance · {formatDay(today)}
              </Text>
              {performance.length === 0 ? (
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  No completed jobs yet today.
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

              <Text className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
                Reopening a closed day is an admin action.
              </Text>
            </>
          ) : (
            <>
              <View className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <Text className="text-lg font-bold text-neutral-900 dark:text-white">Today so far</Text>
                {report ? (
                  <>
                    <StatRow label="Jobs finished" value={String(report.jobCount)} />
                    <StatRow label="Revenue" value={formatPesos(report.revenueCents)} />
                    <MethodBreakdown breakdown={parseMethodBreakdown(JSON.stringify(report.revenueByMethodCents))} showTotal />
                    <StatRow
                      label="Voids"
                      value={`${report.voidedCount} · ${formatPesos(report.voidedAmountCents)}`}
                    />
                    <StatRow label="Expenses" value={formatPesos(report.expensesCents)} />
                    <View className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" />
                    <StatRow label="Expected cash" value={formatPesos(report.expectedCashCents)} />
                  </>
                ) : (
                  <ActivityIndicator color="#0891B2" className="py-6" />
                )}
              </View>

              <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Declared cash
              </Text>
              <TextInput
                value={declaredInput}
                onChangeText={setDeclaredInput}
                keyboardType="numeric"
                placeholder="₱ 0.00"
                placeholderTextColor="#A1A1AA"
                className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-lg font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                placeholderTextColor="#A1A1AA"
                className="mt-3 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />

              <View className="mt-4 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    Expected vs declared
                  </Text>
                  <Text
                    className={`text-base font-bold ${variance < 0 ? 'text-red-600 dark:text-red-400' : variance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}
                  >
                    {variance === 0 ? 'Balanced' : `${variance < 0 ? 'Short ' : 'Over '}${formatPesos(Math.abs(variance))}`}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onCloseDay}
                disabled={closeDay.isPending || !report}
                className="mt-5 rounded-2xl bg-brand-600 px-4 py-4 active:bg-brand-700 disabled:opacity-50"
              >
                <Text className="text-center text-base font-bold text-white">
                  {closeDay.isPending ? 'Closing...' : 'Close day'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}
