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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import {
  useActiveServices,
  useInventory,
  useSaveServiceUsages,
  useServiceUsageConfig,
} from '@/data/queries';
import type { Service } from '@/data/schema';
import { useSessionStore } from '@/stores/session-store';

interface EditState {
  service: Service;
  entries: Record<string, number>;
}

export default function AdminServiceInventoryScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: services, isLoading: loadingServices } = useActiveServices();
  const { data: items, isLoading: loadingItems } = useInventory();
  const { data: config, isLoading: loadingConfig, refetch, isRefetching } = useServiceUsageConfig();
  const saveUsages = useSaveServiceUsages();

  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const itemsList = items ?? [];
  const configRows = config ?? [];
  const usageByService = new Map<string, { itemId: string; itemName: string; unit: string; quantityUsed: number }[]>();
  for (const row of configRows) {
    const list = usageByService.get(row.serviceId) ?? [];
    list.push({ itemId: row.itemId, itemName: row.itemName, unit: row.unit, quantityUsed: row.quantityUsed });
    usageByService.set(row.serviceId, list);
  }

  const handleOpenEdit = (service: Service) => {
    const entries: Record<string, number> = {};
    for (const usage of usageByService.get(service.id) ?? []) {
      entries[usage.itemId] = usage.quantityUsed;
    }
    setEditing({ service, entries });
  };

  const handleSave = () => {
    if (!editing) return;
    const usages = Object.entries(editing.entries)
      .filter(([, qty]) => qty > 0)
      .map(([inventoryItemId, quantityUsed]) => ({ inventoryItemId, quantityUsed }));
    setSaving(true);
    saveUsages
      .mutateAsync({ serviceId: editing.service.id, usages, actorId })
      .then(() => setEditing(null))
      .catch((error) =>
        Alert.alert('Failed to save recipe', error instanceof Error ? error.message : 'Something went wrong.'),
      )
      .finally(() => setSaving(false));
  };

  const isLoading = loadingServices || loadingItems || loadingConfig;

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader
          title="Service inventory"
          subtitle="When a job for a service is completed, its recipe items are auto-deducted from stock."
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : (services ?? []).length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">No services</Text>
            <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
              Create services first, then map the inventory each one consumes.
            </Text>
          </View>
        ) : (
          <FlatList
            data={services}
            keyExtractor={(service) => service.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item: service }) => {
              const usages = usageByService.get(service.id) ?? [];
              return (
                <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                      {service.name}
                    </Text>
                    <Pressable
                      onPress={() => handleOpenEdit(service)}
                      className="rounded-xl bg-brand-600 px-3 py-2 active:bg-brand-700"
                    >
                      <Text className="text-sm font-semibold text-white">
                        {usages.length === 0 ? 'Configure' : 'Edit'}
                      </Text>
                    </Pressable>
                  </View>
                  {usages.length === 0 ? (
                    <Text className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
                      No inventory items mapped — nothing is deducted on completion.
                    </Text>
                  ) : (
                    <View className="mt-2 gap-1">
                      {usages.map((usage) => (
                        <View key={usage.itemId} className="flex-row items-center justify-between">
                          <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                            {usage.itemName}
                          </Text>
                          <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {usage.quantityUsed} {usage.unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        <Modal
          visible={editing !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setEditing(null)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-[85%] rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">
                {editing?.service.name} recipe
              </Text>
              <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Set how much of each item this service consumes per job. Leave at 0 to not use it.
              </Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View className="gap-3">
                  {itemsList.map((item) => {
                    const qty = editing?.entries[item.id] ?? 0;
                    return (
                      <View
                        key={item.id}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {item.name}
                        </Text>
                        <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                          On hand: {item.quantity} {item.unit}
                        </Text>
                        <View className="mt-2 flex-row gap-2">
                          {[0, 1, 2, 3, 5].map((amount) => {
                            const selected = qty === amount;
                            return (
                              <Pressable
                                key={amount}
                                onPress={() =>
                                  setEditing((state) =>
                                    state ? { ...state, entries: { ...state.entries, [item.id]: amount } } : state,
                                  )
                                }
                                className={`flex-1 items-center rounded-xl border px-2 py-2 active:opacity-80 ${
                                  selected
                                    ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                                }`}
                              >
                                <Text
                                  className={`text-sm font-semibold ${
                                    selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-700 dark:text-neutral-300'
                                  }`}
                                >
                                  {amount === 0 ? 'None' : `${amount} ${item.unit}`}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
              <View className="mt-4 flex-row gap-2">
                <Pressable
                  onPress={() => setEditing(null)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                >
                  <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-40"
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">Save recipe</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}
