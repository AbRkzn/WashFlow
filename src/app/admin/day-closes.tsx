import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { useDayCloses, useReopenDay } from '@/data/queries';
import { formatDay } from '@/domain/day-close';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

export default function AdminDayCloses() {
  const adminId = useSessionStore((s) => s.user?.id ?? '');
  const { data: closes = [], isLoading } = useDayCloses();
  const reopenDay = useReopenDay();

  const onReopen = (day: string) => {
    Alert.alert(
      'Reopen this day?',
      'The day will be reopened and can be closed again. Its report is kept in the audit log.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          style: 'destructive',
          onPress: () =>
            reopenDay
              .mutateAsync({ day, adminId })
              .then(() => Alert.alert('Done', 'Day reopened.'))
              .catch((error) =>
                Alert.alert('Reopen failed', error instanceof Error ? error.message : 'Something went wrong.'),
              ),
        },
      ],
    );
  };

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Closed days</Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Reopen a day to allow a corrected close.
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#0891B2" className="py-10" />
          ) : closes.length === 0 ? (
            <View className="mt-16 items-center">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">No closed days</Text>
              <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Closed days appear here after a manager closes one.
              </Text>
            </View>
          ) : (
            <View className="mt-5 gap-3">
              {closes.map((close) => (
                <View
                  key={close.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-neutral-900 dark:text-white">
                      {formatDay(close.day)}
                    </Text>
                    <Text className="text-sm text-neutral-400 dark:text-neutral-500">
                      {formatClockTime(close.closedAt)}
                    </Text>
                  </View>
                  <View className="mt-2 flex-row justify-between">
                    <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                      {close.jobCount} jobs · {formatPesos(close.revenueCents)}
                    </Text>
                    <Text
                      className={`text-sm font-semibold ${close.varianceCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-700 dark:text-neutral-200'}`}
                    >
                      {close.varianceCents >= 0 ? '+' : ''}
                      {formatPesos(close.varianceCents)} variance
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onReopen(close.day)}
                    disabled={reopenDay.isPending}
                    className="mt-3 rounded-xl border border-red-300 px-4 py-2.5 active:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:active:bg-red-950"
                  >
                    <Text className="text-center text-sm font-semibold text-red-600 dark:text-red-400">
                      Reopen day
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}
