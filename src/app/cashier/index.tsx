import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { jobKeys, recentPlatesKeys, useActiveServices, useDaySlots, useQueuedCount, useRecentPlates } from '@/data/queries';
import { SessionHeader } from '@/components/session-header';
import { checkIn, findActiveJobForPlate, lookupByPlate, type VehicleMatch } from '@/services/checkin';
import { formatPesos } from '@/utils/money';
import type { QueueEntry } from '@/data/repositories';
import { JOB_STATUS_LABELS } from '@/domain/job';
import { todayKey } from '@/services/appointments';

export default function CashierCheckInScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [plate, setPlate] = useState('');
  const [match, setMatch] = useState<VehicleMatch | null>(null);
  const [activeJob, setActiveJob] = useState<QueueEntry | null>(null);
  const [searched, setSearched] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: services, isLoading: servicesLoading } = useActiveServices();
  const { data: recentPlates = [] } = useRecentPlates();
  const { data: queuedCount = 0 } = useQueuedCount();
  const { data: daySlots } = useDaySlots(todayKey());
  const bookingsCount = (daySlots ?? []).filter((slot) => slot.entry).length;

  const stats = [
    { label: 'Queued', value: queuedCount, icon: 'list-outline' },
    { label: 'Bookings', value: bookingsCount, icon: 'calendar-outline' },
  ] as const;

  const selectedService = useMemo(
    () => services?.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const canConfirm = !!plate.trim() && !!selectedServiceId && !busy;

  const handleLookup = async (plateToLookup = plate) => {
    const normalized = plateToLookup.trim().toUpperCase();
    setPlate(normalized);
    setSearched(true);
    setSuccess(null);
    if (!normalized) {
      setMatch(null);
      setActiveJob(null);
      return;
    }
    try {
      setMatch(await lookupByPlate(normalized));
      setActiveJob(await findActiveJobForPlate(normalized));
    } catch (e) {
      setMatch(null);
      setActiveJob(null);
      setError(e instanceof Error ? e.message : 'Lookup failed.');
    }
  };

  const runCheckIn = async (): Promise<boolean> => {
    if (!canConfirm || !selectedServiceId) {
      return false;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const { vehicle } = await checkIn({
        plate,
        serviceId: selectedServiceId,
        newCustomer: match ? undefined : { name: customerName, phone: customerPhone },
      });
      setSuccess(`${vehicle.plateNumber} queued.`);
      setPlate('');
      setMatch(null);
      setActiveJob(null);
      setSearched(false);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedServiceId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: jobKeys.queued }),
        queryClient.invalidateQueries({ queryKey: jobKeys.queuedCount }),
        queryClient.invalidateQueries({ queryKey: recentPlatesKeys.list }),
      ]);
      setTimeout(() => router.push('/cashier/queue'), 800);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!canConfirm || !selectedServiceId) {
      return;
    }
    if (activeJob && activeJob.job.status !== 'queued') {
      Alert.alert(
        'Plate already being worked',
        `${activeJob.vehicle.plateNumber} is already ${JOB_STATUS_LABELS[activeJob.job.status].toLowerCase()} (${activeJob.customer.name}). Queue a duplicate anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Queue anyway', onPress: () => runCheckIn() },
        ],
      );
      return;
    }
    if (activeJob) {
      Alert.alert(
        'Plate already queued',
        `${activeJob.vehicle.plateNumber} is already in the queue as ${JOB_STATUS_LABELS[activeJob.job.status].toLowerCase()} (${activeJob.customer.name}). Queue a duplicate anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Queue anyway', onPress: () => runCheckIn() },
        ],
      );
      return;
    }
    await runCheckIn();
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <SessionHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Check-in</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Plate → service → queue
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/cashier/queue')}
              className="flex-row items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 active:opacity-80 dark:bg-white"
            >
              <Text className="text-sm font-semibold text-white dark:text-neutral-900">
                Queue
              </Text>
              <View className="rounded-full bg-brand-500 px-2 py-0.5">
                <Text className="text-xs font-bold text-white">{queuedCount}</Text>
              </View>
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-2">
            {stats.map((stat) => (
              <View
                key={stat.label}
                className="flex-1 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Ionicons name={stat.icon} size={16} color="#0891B2" />
                <Text className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  {stat.value}
                </Text>
                <Text className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {recentPlates.length > 0 ? (
            <View className="mt-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Recent
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {recentPlates.map((recent) => (
                  <Pressable
                    key={recent.id}
                    onPress={() => handleLookup(recent.plate)}
                    className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 active:opacity-70 dark:border-brand-900 dark:bg-brand-950"
                  >
                    <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                      {recent.plate}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Plate number
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={plate}
                onChangeText={(text) => {
                  setPlate(text.toUpperCase());
                  setMatch(null);
                  setActiveJob(null);
                  setSearched(false);
                  setSuccess(null);
                }}
                placeholder="e.g. ABC-1234"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-base font-semibold tracking-widest text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />
              <Pressable
                onPress={() => handleLookup()}
                className="items-center justify-center rounded-2xl bg-brand-600 px-5 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-white">Look up</Text>
              </Pressable>
            </View>
          </View>

          {error ? (
            <Text className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</Text>
          ) : null}

          {success ? (
            <View className="mt-3 rounded-2xl bg-green-50 px-4 py-3 dark:bg-green-950">
              <Text className="text-sm font-semibold text-green-700 dark:text-green-400">
                {success}
              </Text>
            </View>
          ) : null}

          {activeJob ? (
            <View className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950">
              <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Already {JOB_STATUS_LABELS[activeJob.job.status].toLowerCase()}
              </Text>
              <Text className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                {activeJob.vehicle.plateNumber} · {activeJob.customer.name} ·{' '}
                {activeJob.service?.name ?? 'Service'} — a duplicate will be flagged on confirm.
              </Text>
            </View>
          ) : null}

          {searched && plate.trim() && !error ? (
            <View className="mt-4">
              {match ? (
                <View className="rounded-2xl border border-brand-200 bg-white p-4 dark:border-brand-900 dark:bg-neutral-900">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    Returning customer
                  </Text>
                  <Text className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                    {match.customer.name}
                  </Text>
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    {match.vehicle.make && match.vehicle.model
                      ? `${match.vehicle.make} ${match.vehicle.model}`
                      : 'Vehicle registered'}
                    {match.customer.phone ? ` · ${match.customer.phone}` : ''}
                  </Text>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/cashier/vehicle-history',
                        params: { vehicleId: match.vehicle.id },
                      })
                    }
                    className="mt-3 flex-row items-center gap-1.5 self-start rounded-xl border border-brand-200 px-3 py-2 active:bg-brand-50 dark:border-brand-900 dark:active:bg-brand-950"
                  >
                    <Ionicons name="time-outline" size={16} color="#0E7490" />
                    <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                      View history
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    New vehicle
                  </Text>
                  <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Name and phone are optional — we can queue as walk-in.
                  </Text>
                  <View className="mt-3 gap-2">
                    <TextInput
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="Name (optional)"
                      placeholderTextColor="#94A3B8"
                      className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                    <TextInput
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      placeholder="Phone (optional)"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                  </View>
                </View>
              )}
            </View>
          ) : null}

          <Text className="mb-2 mt-6 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Service
          </Text>
          {servicesLoading ? (
            <View className="py-8">
              <ActivityIndicator color="#0891B2" />
            </View>
          ) : (
            <View className="gap-3">
            {services?.map((service) => {
              const selected = service.id === selectedServiceId;
              return (
                <Pressable
                  key={service.id}
                  onPress={() => {
                    setSelectedServiceId(service.id);
                    setSuccess(null);
                  }}
                  className={`rounded-2xl border p-4 active:opacity-80 ${
                    selected
                      ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-base font-semibold ${
                        selected
                          ? 'text-brand-800 dark:text-brand-200'
                          : 'text-neutral-900 dark:text-white'
                      }`}
                    >
                      {service.name}
                    </Text>
                    <Text
                      className={`text-base font-bold ${
                        selected
                          ? 'text-brand-700 dark:text-brand-300'
                          : 'text-neutral-900 dark:text-white'
                      }`}
                    >
                      {formatPesos(service.priceCents)}
                    </Text>
                  </View>
                  {service.description ? (
                    <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {service.description}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
            </View>
          )}

          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            className="mt-6 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 active:opacity-80 disabled:opacity-40"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-white">Confirm &amp; Queue</Text>
            )}
            {selectedService && !busy ? (
              <Text className="text-base font-semibold text-white/90">
                · {formatPesos(selectedService.priceCents)}
              </Text>
            ) : null}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
