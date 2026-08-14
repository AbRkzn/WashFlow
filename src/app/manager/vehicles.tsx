import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { SearchBar } from '@/components/ui/search-bar';
import { EmptyState } from '@/components/empty-state';
import { useVehicleDirectory } from '@/data/queries';

const COLOR_DOTS: Record<string, string> = {
  White: '#E5E7EB',
  Black: '#1F2937',
  Silver: '#C0C8D0',
  Gray: '#9CA3AF',
  Red: '#EF4444',
  Blue: '#3B82F6',
  Green: '#22C55E',
  Yellow: '#EAB308',
  Orange: '#F97316',
  Brown: '#92400E',
};

export default function VehiclesScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useVehicleDirectory();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const vehicles = data?.vehicles ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return vehicles;
    return vehicles.filter((entry) => {
      const plate = entry.vehicle.plateNumber.toLowerCase();
      const owner = entry.owner?.name.toLowerCase() ?? '';
      const make = (entry.vehicle.make ?? '').toLowerCase();
      return plate.includes(needle) || owner.includes(needle) || make.includes(needle);
    });
  }, [data, query]);

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Vehicles</Text>
          <Pressable
            onPress={() => router.push('/manager/add-vehicle')}
            className="flex-row items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 active:bg-brand-700"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">Add vehicle</Text>
          </Pressable>
        </View>

        <View className="px-5 pb-3 pt-3">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search plate, owner, or make"
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={data?.vehicles.length ? 'search-outline' : 'car-outline'}
            title={data?.vehicles.length ? 'No matches' : 'No vehicles yet'}
            subtitle={
              data?.vehicles.length
                ? 'Try a different plate, owner, or make.'
                : 'Register your first vehicle to build the registry.'
            }
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(entry) => entry.vehicle.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListFooterComponent={
              <Text className="mt-2 text-center text-xs text-neutral-400 dark:text-neutral-500">
                {filtered.length} vehicle{filtered.length === 1 ? '' : 's'} · tap for history
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/cashier/vehicle-history',
                    params: { vehicleId: item.vehicle.id },
                  })
                }
                className="rounded-3xl border border-neutral-200 bg-white p-4 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-bold tracking-wider text-brand-700 dark:text-brand-300">
                    {item.vehicle.plateNumber}
                  </Text>
                  <View
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor:
                        COLOR_DOTS[item.vehicle.color ?? ''] ?? `${COLOR_DOTS['White']}`,
                    }}
                  >
                    <Ionicons name="car-sport-outline" size={18} color="#0F172A" />
                  </View>
                </View>
                <Text className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {item.owner?.name ?? 'Unassigned vehicle'}
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  {[item.vehicle.make, item.vehicle.model, item.vehicle.year]
                    .filter(Boolean)
                    .join(' · ') || 'No make/model on file'}
                </Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="rounded-full bg-brand-50 px-2.5 py-1 dark:bg-brand-950">
                    <Text className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                      {item.vehicle.color ?? 'No color'}
                    </Text>
                  </View>
                  {item.owner?.phone ? (
                    <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                      {item.owner.phone}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}