import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { JobNotFound } from '@/components/job-not-found';
import { PlateBadge } from '@/components/plate-badge';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Screen } from '@/components/ui/screen';
import { useMarkDone, useWasherBoard } from '@/data/queries';
import { useSessionStore } from '@/stores/session-store';

const TARGET_SECONDS = 180; // 3-minute target dry

export default function DryingProcessScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const washerId = useSessionStore((s) => s.user?.id ?? '');
  const { data: myJobs, isLoading } = useWasherBoard(washerId);
  const markDone = useMarkDone();

  const entry = myJobs?.find((item) => item.job.id === jobId);

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [doneSteps, setDoneSteps] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running]);

  const progress = Math.min(1, elapsed / TARGET_SECONDS);

  const toggleRunning = () => setRunning((value) => !value);
  const resetTimer = () => {
    setRunning(false);
    setElapsed(0);
    setDoneSteps([]);
  };

  const markStep = (label: string) =>
    setDoneSteps((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );

  const handleFinish = async () => {
    if (entry?.job.status !== 'in_progress') return;
    try {
      await markDone.mutateAsync({ jobId: entry.job.id, washerId });
      router.push(`/washer/inspection?jobId=${entry.job.id}`);
    } catch (error) {
      Alert.alert('Could not finish drying', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View className="items-center py-12">
          <ActivityIndicator color="#0891B2" />
        </View>
      </Screen>
    );
  }

  if (!entry) {
    return (
      <RoleGuard roles={['washer', 'manager', 'admin']}>
        <Screen>
          <BackButton />
          <JobNotFound />
        </Screen>
      </RoleGuard>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <RoleGuard roles={['washer', 'manager', 'admin']}>
      <Screen>
        <View className="flex-row items-center gap-3">
          <BackButton />
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Drying process
          </Text>
        </View>

        <Card className="mt-4">
          <View className="flex-row items-center justify-between">
            <PlateBadge plate={entry.vehicle.plateNumber} size="lg" />
            <Text className="text-sm text-neutral-400 dark:text-neutral-500">
              {entry.service?.name ?? 'Service'}
            </Text>
          </View>
          <Text className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
            {entry.customer.name}
          </Text>
        </Card>

        <View className="mt-6 items-center">
          <ProgressRing
            progress={progress}
            label={formatTime(elapsed)}
            size={150}
          />
          <View className="mt-3 flex-row items-center gap-3">
            <Button
              label={running ? 'Pause' : 'Start timer'}
              icon={running ? 'pause' : 'play'}
              size="sm"
              fullWidth={false}
              onPress={toggleRunning}
            />
            <Button
              label="Reset"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={resetTimer}
            />
          </View>
        </View>

        <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          Drying checklist
        </Text>
        <Card className="mt-2">
          {['Exterior hand-dry', 'Window streak check', 'Trims and mirrors', 'Interior moisture check'].map(
            (step) => {
              const isChecked = doneSteps.includes(step);
              return (
                <Pressable
                  key={step}
                  onPress={() => markStep(step)}
                  className={`mb-2 flex-row items-center gap-3 rounded-xl border px-4 py-3 last:mb-0 ${
                    isChecked
                      ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  }`}
                >
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border ${
                      isChecked ? 'border-brand-600 bg-brand-600' : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {isChecked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text
                    className={`flex-1 text-sm font-semibold ${
                      isChecked
                        ? 'text-brand-800 dark:text-brand-200 line-through'
                        : 'text-neutral-800 dark:text-neutral-100'
                    }`}
                  >
                    {step}
                  </Text>
                </Pressable>
              );
            },
          )}
        </Card>

        <View className="mt-6">
          <Button
            label="Send to quality check"
            icon="checkmark-done-outline"
            onPress={handleFinish}
            disabled={entry.job.status !== 'in_progress' || markDone.isPending}
            loading={markDone.isPending}
          />
        </View>
      </Screen>
    </RoleGuard>
  );
}