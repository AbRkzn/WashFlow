import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { RoleGuard } from '@/components/role-guard';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useRecentActivity } from '@/data/queries';
import { useSessionStore } from '@/stores/session-store';
import { formatClockTime } from '@/utils/time';

export default function NotificationsScreen() {
  const user = useSessionStore((s) => s.user);
  const { data: items, isLoading, isError, refetch, isRefetching } = useRecentActivity();
  const [filterMine, setFilterMine] = useState(false);

  const visibleItems = useMemo(() => {
    if (!filterMine || !user) return items ?? [];
    return (items ?? []).filter(
      (item) => item.actorId === user.id || item.assignedTo === user.id,
    );
  }, [items, filterMine, user]);

  const clearVisible = () => {
    Alert.alert('Notifications are read-only', 'This feed mirrors your on-device audit trail. Nothing to clear.');
  };

  return (
    <RoleGuard roles={['admin', 'manager', 'cashier', 'washer']}>
      <Screen scroll={false}>
        <View className="flex-1 px-5 pt-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <BackButton />
              <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
                Notifications
              </Text>
            </View>
            <Pressable onPress={clearVisible} className="rounded-xl px-3 py-1.5 active:opacity-70">
              <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Clear
              </Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => setFilterMine(true)}
            className={`rounded-full px-4 py-1.5 ${
              filterMine
                ? 'bg-brand-600'
                : 'border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <Text className={`text-sm font-semibold ${filterMine ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
              Mine
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterMine(false)}
            className={`rounded-full px-4 py-1.5 ${
              !filterMine
                ? 'bg-brand-600'
                : 'border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <Text className={`text-sm font-semibold ${!filterMine ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
              All activity
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <Ionicons name="cloud-offline-outline" size={40} color="#DC2626" />
            <Text className="mt-3 text-base font-semibold text-red-600 dark:text-red-400">
              Could not load your feed
            </Text>
            <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Something went wrong while reading recent activity.
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            className="mt-4 flex-1"
            contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#0891B2"
              />
            }
            ListEmptyComponent={
              <View className="items-center py-16">
                <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
                <Text className="mt-3 text-base font-semibold text-neutral-600 dark:text-neutral-300">
                  No notifications yet
                </Text>
                <Text className="mt-1 text-center text-sm text-neutral-400 dark:text-neutral-500">
                  Job assignments, payments and day-close summaries show up here.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Card className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${item.tint}1A` }}
                >
                  <Ionicons name={item.icon} size={20} color={item.tint} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                    {item.title}
                  </Text>
                  <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                    {item.body}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                    {formatClockTime(item.createdAt)}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}
        </View>
      </Screen>
    </RoleGuard>
  );
}