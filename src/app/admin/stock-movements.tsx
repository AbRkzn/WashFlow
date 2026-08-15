import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import { useStockMovements } from '@/data/queries';
import { ADJUSTMENT_TYPE_LABELS } from '@/domain/inventory';
import { formatDateTime } from '@/utils/time';

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  restock: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
  usage: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300' },
  waste: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
  correction: { bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-700 dark:text-violet-300' },
};

export default function StockMovementsScreen() {
  const { data: movements, isLoading, isRefetching, refetch } = useStockMovements();
  const list = movements ?? [];

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader title="Stock movements" />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : list.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="swap-vertical-outline" size={40} color="#A3A3A3" />
            <Text className="mt-3 text-lg font-bold text-neutral-900 dark:text-white">
              No stock movements yet
            </Text>
            <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Restocks, usage, waste, and corrections will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(movement) => movement.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.correction;
              const positive = item.changeQty > 0;
              return (
                <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 pr-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      {item.itemName ?? 'Unknown item'}
                    </Text>
                    <Text
                      className={`text-base font-bold ${
                        positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {item.changeQty}
                    </Text>
                  </View>
                  <View className="mt-1.5 flex-row items-center">
                    <View className={`rounded-full px-2.5 py-0.5 ${style.bg}`}>
                      <Text className={`text-xs font-medium ${style.text}`}>
                        {ADJUSTMENT_TYPE_LABELS[item.type]}
                      </Text>
                    </View>
                    <Text className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
                      {formatDateTime(item.createdAt)}
                    </Text>
                  </View>
                  <View className="mt-2 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                    {item.reason ? (
                      <Text className="text-sm text-neutral-600 dark:text-neutral-300">{item.reason}</Text>
                    ) : null}
                    {item.actorName ? (
                      <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                        {item.reason ? '· ' : ''}by {item.actorName}
                      </Text>
                    ) : null}
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