import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { useCustomerDirectory, useRegisterCustomer, useUpdateCustomer } from '@/data/queries';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatDateTime } from '@/utils/time';

export default function ManagerCustomersScreen() {
  const router = useRouter();
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data, isLoading, isRefetching, refetch } = useCustomerDirectory();
  const registerCustomer = useRegisterCustomer();
  const updateCustomer = useUpdateCustomer();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plates, setPlates] = useState('');
  const [adding, setAdding] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const openAdd = () => {
    setName('');
    setPhone('');
    setPlates('');
    setShowAdd(true);
  };

  const openEdit = (customerId: string, currentName: string, currentPhone: string | null) => {
    setEditTarget({ id: customerId, name: currentName, phone: currentPhone ?? '' });
    setEditName(currentName);
    setEditPhone(currentPhone ?? '');
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editName.trim()) {
      Alert.alert('Name required', 'Enter the customer name.');
      return;
    }
    setSavingEdit(true);
    try {
      await updateCustomer.mutateAsync({
        customerId: editTarget.id,
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        actorId,
      });
      setEditTarget(null);
    } catch (error) {
      Alert.alert('Could not update customer', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSavingEdit(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter the customer name.');
      return;
    }
    setAdding(true);
    try {
      await registerCustomer.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        plates: plates
          .split(/[\s,]+/)
          .map((p) => p.trim())
          .filter(Boolean),
        actorId,
      });
      setShowAdd(false);
    } catch (error) {
      Alert.alert('Could not add customer', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

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
          <Pressable
            onPress={openAdd}
            className="flex-row items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 active:bg-brand-700"
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">Add customer</Text>
          </Pressable>
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
                : 'Tap "Add customer" to register one, or check in a vehicle.'}
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
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-bold text-brand-700 dark:text-brand-300">
                      {formatPesos(item.totalSpentCents)}
                    </Text>
                    <Pressable
                      onPress={() => openEdit(item.customer.id, item.customer.name, item.customer.phone)}
                      hitSlop={8}
                      className="rounded-lg border border-neutral-200 p-1.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                    >
                      <Ionicons name="pencil-outline" size={16} color="#64748B" />
                    </Pressable>
                  </View>
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

        <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <View className="w-full max-w-sm rounded-3xl bg-white p-5 dark:bg-neutral-900">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-neutral-900 dark:text-white">Add customer</Text>
                <Pressable onPress={() => setShowAdd(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </Pressable>
              </View>
              <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Register a customer and their vehicles before the first visit.
              </Text>

              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Customer name"
                placeholderTextColor="#94A3B8"
                className="mt-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />

              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Phone (optional)
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="09xx-xxx-xxxx"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                className="mt-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />

              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Plates (optional)
              </Text>
              <TextInput
                value={plates}
                onChangeText={setPlates}
                placeholder="ABC 123, XYZ 789"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                className="mt-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />
              <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                Separate multiple plates with spaces or commas.
              </Text>

              <Pressable
                onPress={submit}
                disabled={adding}
                className="mt-5 rounded-xl bg-brand-600 py-3 active:bg-brand-700 disabled:opacity-50"
              >
                {adding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">Add customer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={editTarget !== null} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <View className="w-full max-w-sm rounded-3xl bg-white p-5 dark:bg-neutral-900">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-neutral-900 dark:text-white">Edit customer</Text>
                <Pressable onPress={() => setEditTarget(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </Pressable>
              </View>
              <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Update the customer&apos;s name and phone.
              </Text>

              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Name
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Customer name"
                placeholderTextColor="#94A3B8"
                className="mt-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />

              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Phone
              </Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="09xx-xxx-xxxx"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                className="mt-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />

              <Pressable
                onPress={saveEdit}
                disabled={savingEdit}
                className="mt-5 rounded-xl bg-brand-600 py-3 active:bg-brand-700 disabled:opacity-50"
              >
                {savingEdit ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">Save changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}
