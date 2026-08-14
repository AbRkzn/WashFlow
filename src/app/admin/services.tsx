import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import {
  useAllServices,
  useCreateService,
  useDeleteService,
  useUpdateService,
} from '@/data/queries';
import type { Service } from '@/data/schema';
import { formatMinutesOfDay } from '@/utils/time';
import { formatPesos } from '@/utils/money';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

interface ServiceFormState {
  name: string;
  description: string;
  price: string;
  durationMinutes: number;
  isActive: boolean;
}

const emptyForm: ServiceFormState = {
  name: '',
  description: '',
  price: '',
  durationMinutes: 30,
  isActive: true,
};

function parsePriceCents(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export default function AdminServicesScreen() {
  const { data: services, isLoading, isRefetching, refetch } = useAllServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

  const name = form.name.trim();
  const priceCents = parsePriceCents(form.price);
  const saving = createService.isPending || updateService.isPending;
  const canSubmit = name.length > 0 && priceCents !== null && !saving;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? '',
      price: (service.priceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!canSubmit || priceCents === null) return;
    const values = {
      name,
      description: form.description.trim() || null,
      priceCents,
      durationMinutes: form.durationMinutes,
      isActive: form.isActive,
    };
    const success = () => {
      handleClose();
      Alert.alert(editing ? 'Service updated' : 'Service created', name);
    };
    if (editing) {
      updateService.mutateAsync({ id: editing.id, patch: values }).then(success).catch(handleError);
    } else {
      createService.mutateAsync(values).then(success).catch(handleError);
    }
  };

  const handleError = (error: unknown) => {
    Alert.alert('Failed to save service', error instanceof Error ? error.message : 'Something went wrong.');
  };

  const handleDelete = (service: Service) => {
    Alert.alert('Delete service?', `${service.name} will be removed from the active list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteService
            .mutateAsync(service.id)
            .then(() => {
              handleClose();
              Alert.alert('Service deleted', service.name);
            })
            .catch(handleError);
        },
      },
    ]);
  };

  const serviceList = services ?? [];

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader
          title="Service presets"
          right={
            <Pressable
              onPress={openAdd}
              className="flex-row items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 active:bg-brand-700"
            >
              <Text className="text-sm font-semibold text-white">Add service</Text>
            </Pressable>
          }
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : serviceList.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">No services yet</Text>
            <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
              Add your first price preset — cashiers pick from these at check-in.
            </Text>
          </View>
        ) : (
          <FlatList
            data={serviceList}
            keyExtractor={(service) => service.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <View
                className={`rounded-2xl border p-4 ${
                  item.isActive
                    ? 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                    : 'border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {item.description}
                      </Text>
                    ) : null}
                    <View className="mt-2 flex-row items-center gap-2">
                      <Text className="text-lg font-bold text-brand-700 dark:text-brand-300">
                        {formatPesos(item.priceCents)}
                      </Text>
                      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                        ~{formatMinutesOfDay(item.durationMinutes)}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end gap-2">
                    <View
                      className={`rounded-full px-3 py-1 ${
                        item.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950'
                          : 'bg-neutral-200 dark:bg-neutral-800'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          item.isActive
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openEdit(item)}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                    >
                      <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        Edit
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        <Modal visible={open} animationType="slide" transparent onRequestClose={handleClose}>
          <KeyboardAvoidingView
            className="flex-1 justify-end bg-black/40"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">
                {editing ? `Edit ${editing.name}` : 'Add service'}
              </Text>
              <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Price presets appear in the cashier check-in flow.
              </Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Name
                </Text>
                <TextInput
                  value={form.name}
                  onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                  placeholder="e.g. Express Wash"
                  placeholderTextColor="#94A3B8"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Description (optional)
                </Text>
                <TextInput
                  value={form.description}
                  onChangeText={(description) => setForm((f) => ({ ...f, description }))}
                  placeholder="e.g. Exterior wash + vacuum"
                  placeholderTextColor="#94A3B8"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Price
                </Text>
                <View className="flex-row items-center rounded-xl border border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <Text className="text-base text-neutral-500 dark:text-neutral-400">₱</Text>
                  <TextInput
                    value={form.price}
                    onChangeText={(price) => setForm((f) => ({ ...f, price }))}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    className="ml-2 flex-1 py-3 text-base text-neutral-900 dark:text-white"
                  />
                </View>
                {priceCents === null && form.price.length > 0 ? (
                  <Text className="mt-1 text-xs text-red-500">Enter a valid non-negative price.</Text>
                ) : null}

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Duration
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {DURATION_OPTIONS.map((minutes) => {
                    const selected = minutes === form.durationMinutes;
                    return (
                      <Pressable
                        key={minutes}
                        onPress={() => setForm((f) => ({ ...f, durationMinutes: minutes }))}
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
                          {minutes}m
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {editing ? (
                  <Pressable
                    onPress={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className="mt-4 flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {form.isActive ? 'Service is active' : 'Service is inactive'}
                    </Text>
                    <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                      {form.isActive ? 'Tap to deactivate' : 'Tap to activate'}
                    </Text>
                  </Pressable>
                ) : null}

                <View className="mt-4 flex-row gap-2">
                  {editing ? (
                    <Pressable
                      onPress={() => handleDelete(editing)}
                      disabled={saving || deleteService.isPending}
                      className="rounded-xl border border-red-200 px-4 py-3 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
                    >
                      <Text className="text-sm font-semibold text-red-600 dark:text-red-400">Delete</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={handleClose}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                  >
                    <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-40"
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-sm font-semibold text-white">
                        {editing ? 'Save changes' : 'Add service'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}
