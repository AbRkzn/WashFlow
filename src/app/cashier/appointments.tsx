import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppointmentBookModal } from '@/components/appointment-book-modal';
import { SessionHeader } from '@/components/session-header';
import {
  useCancelAppointment,
  useCheckInAppointment,
  useDaySlots,
} from '@/data/queries';
import type { BookAppointmentResult } from '@/services/appointments';
import { shiftDateKey, todayKey } from '@/services/appointments';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatSlotTime } from '@/domain/appointment';

function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

interface BookTarget {
  slotStart: number;
  timeLabel: string;
  freeForm: boolean;
}

export default function CashierAppointmentsScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const [date, setDate] = useState(() => todayKey());
  const [bookTarget, setBookTarget] = useState<BookTarget | null>(null);

  const { data: slots, isLoading, isRefetching, refetch } = useDaySlots(date);
  const cancelAppointment = useCancelAppointment();
  const checkInAppointment = useCheckInAppointment();

  const reportError = (error: unknown) =>
    Alert.alert('Action failed', error instanceof Error ? error.message : 'Something went wrong.');

  const handleBooked = (result: BookAppointmentResult) => {
    if (result.rescheduled) {
      Alert.alert(
        'Rescheduled by system',
        'The requested slot was already taken, so this appointment was moved to the next available time. The Manager will see the notice.',
      );
    } else {
      Alert.alert('Booked', 'Appointment confirmed.');
    }
  };

  const handleCheckIn = (appointmentId: string) => {
    checkInAppointment
      .mutateAsync({ appointmentId, date, actorId })
      .then(() => Alert.alert('Checked in', 'The vehicle was added to the queue.'))
      .catch(reportError);
  };

  const handleCancel = (appointmentId: string) => {
    cancelAppointment
      .mutateAsync({ appointmentId, date, actorId })
      .then(() => Alert.alert('Cancelled', 'Appointment cancelled.'))
      .catch(reportError);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <SessionHeader />
      <View className="flex-row items-center justify-between px-4 pt-3">
        <Text className="text-lg font-bold text-neutral-900 dark:text-white">Appointments</Text>
      </View>
      <View className="px-4 pt-2">
        <Pressable
          onPress={() =>
            setBookTarget({
              slotStart: Date.now(),
              timeLabel: formatSlotTime(Date.now()),
              freeForm: true,
            })
          }
          className="items-center rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 active:opacity-80 dark:border-brand-900 dark:bg-brand-950"
        >
          <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            Custom time · pick any hour and duration
          </Text>
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable
          onPress={() => setDate((d) => shiftDateKey(d, -1))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 active:opacity-70 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">‹ Prev</Text>
        </Pressable>
        <Text className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          {formatDateLabel(date)}
        </Text>
        <Pressable
          onPress={() => setDate((d) => shiftDateKey(d, 1))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 active:opacity-70 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Next ›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0891B2" />
        </View>
      ) : (slots ?? []).length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">No slots</Text>
          <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
            No appointment slots are configured for this day.
          </Text>
        </View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(slot) => String(slot.slotStart)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
          }
          renderItem={({ item: slot }) => {
            if (slot.available) {
              return (
                <View className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                    {slot.timeLabel}
                  </Text>
                  {slot.inPast ? (
                    <Text className="text-sm text-neutral-400 dark:text-neutral-500">Past</Text>
                  ) : (
                    <Pressable
                      onPress={() =>
                        setBookTarget({
                          slotStart: slot.slotStart,
                          timeLabel: slot.timeLabel,
                          freeForm: false,
                        })
                      }
                      className="rounded-lg bg-brand-600 px-4 py-2 active:bg-brand-700"
                    >
                      <Text className="text-sm font-semibold text-white">Book</Text>
                    </Pressable>
                  )}
                </View>
              );
            }
            const entry = slot.entry!;
            return (
              <View className="rounded-2xl border border-brand-200 bg-white p-4 dark:border-brand-900 dark:bg-neutral-900">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-brand-700 dark:text-brand-300">
                    {slot.timeLabel}
                  </Text>
                  {entry.appointment.rescheduled ? (
                    <View className="rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-950">
                      <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        RESCHEDULED BY SYSTEM
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-1 text-lg font-bold tracking-widest text-neutral-900 dark:text-white">
                  {entry.vehicle.plateNumber}
                </Text>
                <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {entry.customer.name}
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  {entry.service?.name ?? 'Service'}
                  {entry.service ? ` · ${formatPesos(entry.service.priceCents)}` : ''}
                </Text>
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => handleCheckIn(entry.appointment.id)}
                    disabled={checkInAppointment.isPending}
                    className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 active:bg-brand-700 disabled:opacity-50"
                  >
                    <Text className="text-center text-sm font-semibold text-white">Check in</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleCancel(entry.appointment.id)}
                    disabled={cancelAppointment.isPending}
                    className="rounded-xl border border-neutral-300 px-4 py-2.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                  >
                    <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <AppointmentBookModal
        key={bookTarget ? `${bookTarget.slotStart}-${bookTarget.freeForm}` : 'closed'}
        visible={bookTarget !== null}
        date={date}
        slotStart={bookTarget?.slotStart ?? 0}
        slotTimeLabel={bookTarget?.timeLabel ?? ''}
        freeForm={bookTarget?.freeForm ?? false}
        onClose={() => setBookTarget(null)}
        onBooked={handleBooked}
      />
    </SafeAreaView>
  );
}
