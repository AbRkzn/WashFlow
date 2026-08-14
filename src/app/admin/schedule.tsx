import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import {
  useSchedule,
  useSetSchedule,
  useSetWasherPriceVisibility,
  useWasherPriceVisibility,
} from '@/data/queries';
import { DEFAULT_SCHEDULE } from '@/domain/settings';
import { formatMinutesOfDay } from '@/utils/time';

const STEP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;
const SLOT_OPTIONS = [15, 30, 45, 60] as const;

function TimeRow({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </Text>
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          onPress={onDecrease}
          className="rounded-lg border border-neutral-300 px-4 py-2 active:bg-neutral-200 dark:border-neutral-700 dark:active:bg-neutral-700"
        >
          <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">− 15</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
          {formatMinutesOfDay(value)}
        </Text>
        <Pressable
          onPress={onIncrease}
          className="rounded-lg border border-neutral-300 px-4 py-2 active:bg-neutral-200 dark:border-neutral-700 dark:active:bg-neutral-700"
        >
          <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">+ 15</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminScheduleScreen() {
  const { data: schedule, isLoading } = useSchedule();
  const setScheduleMutation = useSetSchedule();
  const { data: washerShowPrices } = useWasherPriceVisibility();
  const setWasherShowPrices = useSetWasherPriceVisibility();

  const [openMinutes, setOpenMinutes] = useState<number | null>(null);
  const [closeMinutes, setCloseMinutes] = useState<number | null>(null);
  const [slotMinutes, setSlotMinutes] = useState<number | null>(null);

  const current = schedule ?? DEFAULT_SCHEDULE;
  const open = openMinutes ?? current.openMinutes;
  const close = closeMinutes ?? current.closeMinutes;
  const slot = slotMinutes ?? current.slotMinutes;

  const dirty =
    schedule !== undefined &&
    (openMinutes !== null || closeMinutes !== null || slotMinutes !== null);
  const invalid = close <= open;
  const saving = setScheduleMutation.isPending;

  const bumpOpen = (delta: number) => {
    setOpenMinutes(Math.min(close - STEP_MINUTES, Math.max(0, open + delta)));
  };

  const bumpClose = (delta: number) => {
    setCloseMinutes(Math.min(DAY_MINUTES, Math.max(open + STEP_MINUTES, close + delta)));
  };

  const handleSave = () => {
    if (invalid || !dirty || saving) return;
    setScheduleMutation.mutate(
      { openMinutes: open, closeMinutes: close, slotMinutes: slot },
      {
        onSuccess: () => {
          Alert.alert('Done', 'Schedule saved.');
          setOpenMinutes(null);
          setCloseMinutes(null);
          setSlotMinutes(null);
        },
        onError: (error) =>
          Alert.alert('Could not save', error instanceof Error ? error.message : 'Something went wrong.'),
      },
    );
  };

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader
          title="Schedule"
          subtitle="Booking hours and appointment slot size. Changes sync to all devices."
        />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
          {isLoading ? (
            <View className="py-10">
              <ActivityIndicator color="#0891B2" />
            </View>
          ) : (
            <>
              <TimeRow
                label="Opening time"
                value={open}
                onDecrease={() => bumpOpen(-STEP_MINUTES)}
                onIncrease={() => bumpOpen(STEP_MINUTES)}
              />
              <TimeRow
                label="Closing time"
                value={close}
                onDecrease={() => bumpClose(-STEP_MINUTES)}
                onIncrease={() => bumpClose(STEP_MINUTES)}
              />

              <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Slot length
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {SLOT_OPTIONS.map((option) => {
                    const selected = option === slot;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setSlotMinutes(option)}
                        className={`rounded-lg border px-4 py-2 ${
                          selected
                            ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                            : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected
                              ? 'text-brand-700 dark:text-brand-300'
                              : 'text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          {option} min
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="rounded-2xl bg-brand-50 px-4 py-3 dark:bg-brand-950">
                <Text className="text-xs text-brand-700 dark:text-brand-300">
                  Bookings are offered from {formatMinutesOfDay(open)} to {formatMinutesOfDay(close)} in
                  {slot}-minute slots. Conflicting bookings auto-reflow to the next free slot.
                </Text>
              </View>

              <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Show prices to washers
                    </Text>
                    <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      When off, washers see only the service name, never the price. Defaults to off.
                    </Text>
                  </View>
                  <Switch
                    value={washerShowPrices ?? false}
                    onValueChange={(value) => {
                      setWasherShowPrices.mutate(value, {
                        onError: (error) =>
                          Alert.alert(
                            'Could not save',
                            error instanceof Error ? error.message : 'Something went wrong.',
                          ),
                      });
                    }}
                    disabled={setWasherShowPrices.isPending}
                    trackColor={{ false: '#D4D4D8', true: '#0E7490' }}
                  />
                </View>
              </View>

              {invalid ? (
                <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Closing time must be after opening time.
                </Text>
              ) : null}

              <Pressable
                onPress={handleSave}
                disabled={!dirty || invalid || saving}
                className="w-full items-center rounded-2xl bg-brand-600 px-6 py-4 active:bg-brand-700 disabled:opacity-40"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">Save schedule</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}
