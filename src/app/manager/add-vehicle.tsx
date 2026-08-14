import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { RoleGuard } from '@/components/role-guard';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
import { Screen } from '@/components/ui/screen';
import { useCustomerDirectory, useRegisterVehicle } from '@/data/queries';
import { useSessionStore } from '@/stores/session-store';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Pickup', 'Coupe', 'Hatchback'] as const;
const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow'] as const;

export default function AddVehicleScreen() {
  const router = useRouter();
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data } = useCustomerDirectory();
  const registerVehicle = useRegisterVehicle();

  const [plate, setPlate] = useState('');
  const [type, setType] = useState<string>(VEHICLE_TYPES[0]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState<string>(COLORS[0]);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  const owners = useMemo(() => {
    const entries = data ?? [];
    const needle = ownerQuery.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => {
      const name = entry.customer.name.toLowerCase();
      const phone = (entry.customer.phone ?? '').toLowerCase();
      return name.includes(needle) || phone.includes(needle);
    });
  }, [data, ownerQuery]);

  const canSave = plate.trim().length >= 3 && !!ownerId && !registerVehicle.isPending;

  const handleSave = async () => {
    if (!ownerId) return;
    try {
      await registerVehicle.mutateAsync({
        plate: plate.trim().toUpperCase(),
        customerId: ownerId,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        color,
        actorId,
      });
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not register vehicle',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <Screen padded={false}>
        <View className="flex-row items-center justify-between px-5">
          <View className="flex-row items-center gap-3">
            <BackButton />
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              Add vehicle
            </Text>
          </View>
        </View>

        <View className="mt-5 px-5">
          <Field
            label="Plate number"
            value={plate}
            onChangeText={(text) => setPlate(text.toUpperCase())}
            placeholder="ABC 123"
            autoCapitalize="characters"
          />

          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Vehicle type
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {VEHICLE_TYPES.map((item) => {
              const active = item === type;
              return (
                <Pressable
                  key={item}
                  onPress={() => setType(item)}
                  className={`rounded-full border px-4 py-2 active:opacity-80 ${
                    active
                      ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active
                        ? 'text-brand-800 dark:text-brand-200'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field label="Brand (make)" value={make} onChangeText={setMake} placeholder="Toyota" />
          <Field label="Model" value={model} onChangeText={setModel} placeholder="Camry" />

          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Color
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {COLORS.map((item) => {
              const active = item === color;
              return (
                <Pressable
                  key={item}
                  onPress={() => setColor(item)}
                  className={`rounded-full border px-4 py-2 active:opacity-80 ${
                    active
                      ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active
                        ? 'text-brand-800 dark:text-brand-200'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Owner customer
          </Text>
          {ownerName ? (
            <Pressable
              onPress={() => {
                setOwnerId(null);
                setOwnerName(null);
              }}
              className="mb-3 flex-row items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-900 dark:bg-brand-950"
            >
              <Text className="text-base font-semibold text-brand-800 dark:text-brand-200">
                {ownerName}
              </Text>
              <Ionicons name="close-circle" size={20} color="#0891B2" />
            </Pressable>
          ) : (
            <>
              <SearchBar value={ownerQuery} onChangeText={setOwnerQuery} placeholder="Search by name or phone" />
              <FlatList
                data={owners}
                keyExtractor={(entry) => entry.customer.id}
                className="max-h-56"
                contentContainerStyle={{ paddingVertical: 4, gap: 4 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setOwnerId(item.customer.id);
                      setOwnerName(item.customer.name);
                      setOwnerQuery('');
                    }}
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-3 active:bg-brand-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-brand-950"
                  >
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {item.customer.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                      {item.customer.phone ?? 'No phone'} · {item.vehicles.length} vehicle
                      {item.vehicles.length === 1 ? '' : 's'}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">
                    No matching customers.
                  </Text>
                }
              />
            </>
          )}

          <View className="mt-4">
            <Button
              label="Save vehicle"
              icon="car-sport-outline"
              onPress={handleSave}
              disabled={!canSave}
              loading={registerVehicle.isPending}
            />
            {!ownerId ? (
              <Text className="mt-2 text-center text-xs text-neutral-400 dark:text-neutral-500">
                Select the customer who owns this vehicle.
              </Text>
            ) : null}
          </View>
        </View>
      </Screen>
    </RoleGuard>
  );
}