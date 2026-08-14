import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { useDayExpenses, useLogExpense } from '@/data/queries';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/domain/expense';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

export default function CashierExpensesScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const [dayTimestamp] = useState(() => Date.now());
  const { data: expenses, isLoading, isRefetching, refetch } = useDayExpenses(dayTimestamp);
  const logExpense = useLogExpense();

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('supplies');
  const [description, setDescription] = useState('');

  const total = (expenses ?? []).reduce((sum, expense) => sum + expense.amountCents, 0);
  const amountCents = Math.round(parseFloat(amount) * 100);
  const canSave = Number.isFinite(amountCents) && amountCents > 0 && !logExpense.isPending;

  const handleClose = () => {
    setAmount('');
    setCategory('supplies');
    setDescription('');
    setModalOpen(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    logExpense
      .mutateAsync({ values: { amountCents, category, description }, actorId })
      .then(() => {
        handleClose();
        Alert.alert('Expense logged', 'Recorded for the daily report.');
      })
      .catch((error) =>
        Alert.alert('Failed to log expense', error instanceof Error ? error.message : 'Something went wrong.'),
      );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <ScreenHeader
        title="Today's expenses"
        right={
          <Pressable
            onPress={() => setModalOpen(true)}
            className="flex-row items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 active:bg-brand-700"
          >
            <Text className="text-sm font-semibold text-white">Log expense</Text>
          </Pressable>
        }
      />

      <View className="mx-4 mb-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          Total today
        </Text>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{formatPesos(total)}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : (expenses ?? []).length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">No expenses yet</Text>
          <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
            Log supplies, utilities, and other costs here for the daily report.
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(expense) => expense.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
          }
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {EXPENSE_CATEGORY_LABELS[item.category]}
                  </Text>
                  <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                    {formatClockTime(item.incurredAt)}
                  </Text>
                </View>
                {item.description ? (
                  <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Text className="text-base font-bold text-neutral-900 dark:text-white">
                {formatPesos(item.amountCents)}
              </Text>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={handleClose}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
            <Text className="text-lg font-bold text-neutral-900 dark:text-white">Log expense</Text>
            <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Cash out of pocket for today.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Amount (₱)
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base font-semibold text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />

              <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Category
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((key) => {
                  const selected = key === category;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setCategory(key)}
                      className={`rounded-xl border px-3 py-2 active:opacity-80 ${
                        selected
                          ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {EXPENSE_CATEGORY_LABELS[key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Description (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Car shampoo refill"
                placeholderTextColor="#94A3B8"
                multiline
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />

              <View className="mt-4 flex-row gap-2">
                <Pressable
                  onPress={handleClose}
                  disabled={logExpense.isPending}
                  className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                >
                  <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={!canSave}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-40"
                >
                  {logExpense.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">Save expense</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
