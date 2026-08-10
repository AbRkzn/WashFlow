import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useActiveServices, useAppointmentConflict, useBookAppointment } from '@/data/queries';
import type { BookAppointmentResult } from '@/services/appointments';
import { lookupByPlate, resolveVehicleCustomer, type VehicleMatch } from '@/services/checkin';
import { APPOINTMENT_DURATION_OPTIONS, DEFAULT_APPOINTMENT_DURATION, formatSlotTime } from '@/domain/appointment';
import { formatPesos } from '@/utils/money';

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

interface AppointmentBookModalProps {
  visible: boolean;
  date: string;
  slotStart: number;
  slotTimeLabel: string;
  durationMinutes?: number;
  freeForm?: boolean;
  onClose: () => void;
  onBooked: (result: BookAppointmentResult) => void;
}

export function AppointmentBookModal({
  visible,
  date,
  slotStart,
  slotTimeLabel,
  durationMinutes = DEFAULT_APPOINTMENT_DURATION,
  freeForm = false,
  onClose,
  onBooked,
}: AppointmentBookModalProps) {
  const { data: services } = useActiveServices();
  const bookAppointment = useBookAppointment();

  const [plate, setPlate] = useState('');
  const [match, setMatch] = useState<VehicleMatch | null>(null);
  const [searched, setSearched] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState(slotStart);
  const [selectedDuration, setSelectedDuration] = useState(durationMinutes);

  const { data: conflict } = useAppointmentConflict(
    date,
    freeForm ? selectedStart : null,
    selectedDuration,
  );

  const canBook = !!plate.trim() && !!selectedServiceId && !bookAppointment.isPending;

  const handleClose = () => {
    setPlate('');
    setMatch(null);
    setSearched(false);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedServiceId(null);
    setError(null);
    onClose();
  };

  const handleLookup = async () => {
    const normalized = plate.trim().toUpperCase();
    setPlate(normalized);
    setSearched(true);
    setError(null);
    if (!normalized) {
      setMatch(null);
      return;
    }
    try {
      setMatch(await lookupByPlate(normalized));
    } catch {
      setMatch(null);
      setError('Vehicle lookup failed.');
    }
  };

  const handleBook = async () => {
    if (!canBook || !selectedServiceId) return;
    setError(null);
    try {
      const { vehicle, customer } = await resolveVehicleCustomer(plate, {
        name: customerName,
        phone: customerPhone,
      });
      const result = await bookAppointment.mutateAsync({
        date,
        slotStart: selectedStart,
        durationMinutes: selectedDuration,
        vehicleId: vehicle.id,
        customerId: customer.id,
        serviceId: selectedServiceId,
      });
      handleClose();
      onBooked(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed.');
    }
  };

  const bumpStart = (deltaMinutes: number) => {
    const d = new Date(selectedStart);
    d.setMinutes(d.getMinutes() + deltaMinutes);
    setSelectedStart(d.getTime());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">
            Book appointment
          </Text>
          <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {date}
            {freeForm
              ? ` · ${formatSlotTime(selectedStart)} (${formatDurationLabel(selectedDuration)})`
              : ` · ${slotTimeLabel}`}
          </Text>

          {freeForm ? (
            <View className="mb-4 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Start time
              </Text>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => bumpStart(-5)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 active:bg-neutral-200 dark:border-neutral-700 dark:active:bg-neutral-700"
                >
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">− 5</Text>
                </Pressable>
                <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                  {formatSlotTime(selectedStart)}
                </Text>
                <Pressable
                  onPress={() => bumpStart(5)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 active:bg-neutral-200 dark:border-neutral-700 dark:active:bg-neutral-700"
                >
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">+ 5</Text>
                </Pressable>
              </View>

              <Text className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Duration
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {APPOINTMENT_DURATION_OPTIONS.map((option) => {
                  const selected = option === selectedDuration;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setSelectedDuration(option)}
                      className={`rounded-lg border px-3 py-1.5 ${
                        selected
                          ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                          : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          selected
                            ? 'text-brand-700 dark:text-brand-300'
                            : 'text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {formatDurationLabel(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {conflict ? (
                <Text className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  This time overlaps another booking. The system will move it to the next free time.
                </Text>
              ) : null}
            </View>
          ) : null}

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Plate number
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={plate}
                onChangeText={(text) => {
                  setPlate(text.toUpperCase());
                  setMatch(null);
                  setSearched(false);
                }}
                placeholder="e.g. ABC-1234"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base font-semibold tracking-widest text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />
              <Pressable
                onPress={handleLookup}
                className="items-center justify-center rounded-xl bg-brand-600 px-4 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-white">Look up</Text>
              </Pressable>
            </View>

            {error ? <Text className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</Text> : null}

            {searched && plate.trim() && !error ? (
              <View className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-900 dark:bg-brand-950">
                {match ? (
                  <>
                    <Text className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                      Returning customer
                    </Text>
                    <Text className="mt-1 text-base font-bold text-neutral-900 dark:text-white">
                      {match.customer.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      New vehicle
                    </Text>
                    <View className="mt-2 gap-2">
                      <TextInput
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Name (optional)"
                        placeholderTextColor="#94A3B8"
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                      />
                      <TextInput
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        placeholder="Phone (optional)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                      />
                    </View>
                  </>
                )}
              </View>
            ) : null}

            <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Service
            </Text>
            <View className="gap-2">
              {services?.map((service) => {
                const selected = service.id === selectedServiceId;
                return (
                  <Pressable
                    key={service.id}
                    onPress={() => setSelectedServiceId(service.id)}
                    className={`rounded-xl border p-3 active:opacity-80 ${
                      selected
                        ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                        : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm font-semibold ${
                          selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {service.name}
                      </Text>
                      <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                        {formatPesos(service.priceCents)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={handleClose}
                disabled={bookAppointment.isPending}
                className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
              >
                <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleBook}
                disabled={!canBook}
                className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-40"
              >
                {bookAppointment.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    Book {formatSlotTime(selectedStart)}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
