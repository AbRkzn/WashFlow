import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { useCustomerDirectory } from '@/data/queries';
import { formatPesos } from '@/utils/money';
import { formatDateTime } from '@/utils/time';

export default function ManagerCustomersScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useCustomerDirectory();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const entries = data ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => {
      const name = entry.customer.name.toLowerCase();
      const phone = (entry.customer.phone ?? '').toLowerCase();
      const plates = entry.vehicles.some((vehicle) => vehicle.plateNumber.toLowerCase().includes(needle));
      return name.includes(needle) || phone.includes(needle) || plates;
    });
  }, [data, query]);

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">Customer directory</Text>
        </View>

        <View className="px-4 pb-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, phone, or plate"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              {data?.length ? 'No matches' : 'No customers yet'}
            </Text>
            <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
              {data?.length
                ? 'Try a different name, phone, or plate.'
                : 'Customers appear here after their first check-in.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(entry) => entry.customer.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListFooterComponent={
              <Text className="mt-2 text-center text-xs text-neutral-400 dark:text-neutral-500">
                {filtered.length} customer{filtered.length === 1 ? '' : 's'} · tap a plate for full history
              </Text>
            }
            renderItem={({ item }) => (
              <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                      {item.customer.name}
                    </Text>
                    <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {item.customer.phone ?? 'No phone on file'}
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-brand-700 dark:text-brand-300">
                    {formatPesos(item.totalSpentCents)}
                  </Text>
                </View>

                {item.vehicles.length > 0 ? (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {item.vehicles.map((vehicle) => (
                      <Pressable
                        key={vehicle.id}
                        onPress={() =>
                          router.push({
                            pathname: '/cashier/vehicle-history',
                            params: { vehicleId: vehicle.id },
                          })
                        }
                        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 active:opacity-80 dark:border-brand-900 dark:bg-brand-950"
                      >
                        <Text className="text-sm font-semibold tracking-wide text-brand-800 dark:text-brand-200">
                          {vehicle.plateNumber}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-3 text-sm text-neutral-400 dark:text-neutral-500">
                    No vehicles on file
                  </Text>
                )}

                <View className="mt-3 flex-row gap-4">
                  <Text className="text-sm text-neutral-600 dark:text-neutral-300">
                    <Text className="font-bold text-neutral-900 dark:text-white">{item.visitCount}</Text>{' '}
                    visits
                  </Text>
                  <Text className="text-sm text-neutral-600 dark:text-neutral-300">
                    Last:{' '}
                    {item.lastVisitAt ? formatDateTime(item.lastVisitAt) : 'Never'}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}
