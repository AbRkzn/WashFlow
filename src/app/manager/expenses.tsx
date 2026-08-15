import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import { useDeleteExpense, useRecentExpenses } from '@/data/queries';
import { EXPENSE_CATEGORY_LABELS } from '@/domain/expense';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatDateTime } from '@/utils/time';

export default function ManagerExpensesScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: expenses, isLoading, isRefetching, refetch } = useRecentExpenses();
  const deleteExpense = useDeleteExpense();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const list = expenses ?? [];
  const total = list.reduce((sum, expense) => sum + expense.amountCents, 0);

  const handleDelete = (id: string, category: string, amountCents: number) => {
    Alert.alert(
      'Delete expense',
      `Remove the ${EXPENSE_CATEGORY_LABELS[category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? category} expense of ${formatPesos(amountCents)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeletingId(id);
            deleteExpense
              .mutateAsync({ expenseId: id, actorId })
              .catch((error) =>
                Alert.alert('Delete failed', error instanceof Error ? error.message : 'Something went wrong.'),
              )
              .finally(() => setDeletingId(null));
          },
        },
      ],
    );
  };

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader title="Expenses" />

        <View className="mx-4 mb-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Total shown
          </Text>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{formatPesos(total)}</Text>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : list.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="cash-outline" size={40} color="#A3A3A3" />
            <Text className="mt-3 text-lg font-bold text-neutral-900 dark:text-white">No expenses yet</Text>
            <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Cashiers log supplies, utilities, and other costs as they happen.
            </Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(expense) => expense.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => {
              const deleting = deletingId === item.id;
              return (
                <View className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {EXPENSE_CATEGORY_LABELS[item.category]}
                      </Text>
                      <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                        {formatDateTime(item.incurredAt)}
                      </Text>
                    </View>
                    {item.description ? (
                      <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-base font-bold text-neutral-900 dark:text-white">
                      {formatPesos(item.amountCents)}
                    </Text>
                    <Pressable
                      onPress={() => handleDelete(item.id, item.category, item.amountCents)}
                      disabled={deleting}
                      className="rounded-lg border border-red-200 p-2 active:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:active:bg-red-950"
                    >
                      {deleting ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}