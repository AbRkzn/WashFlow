import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { JobNotFound } from '@/components/job-not-found';
import { PlateBadge } from '@/components/plate-badge';
import { RoleGuard } from '@/components/role-guard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { useStartJob, useWasherBoard } from '@/data/queries';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';

const WASH_CHECKLIST = [
  'Pre-rinse and soap wash',
  'Interior vacuum',
  'Dust and dashboard wipe',
  'Wheel and tire cleaning',
] as const;

export default function WashingProcessScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const washerId = useSessionStore((s) => s.user?.id ?? '');
  const { data: myJobs, isLoading } = useWasherBoard(washerId);
  const startJob = useStartJob();

  const entry = myJobs?.find((item) => item.job.id === jobId);
  const [checked, setChecked] = useState<boolean[]>(() => WASH_CHECKLIST.map(() => false));

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
          <JobNotFound />
        </Screen>
      </RoleGuard>
    );
  }

  const doneCount = checked.filter(Boolean).length;
  const progress = doneCount / WASH_CHECKLIST.length;
  const canFinish = entry.job.status === 'in_progress' || entry.job.status === 'assigned';

  const toggle = (index: number) =>
    setChecked((current) => current.map((value, i) => (i === index ? !value : value)));

  const handleNext = async () => {
    if (entry.job.status === 'assigned') {
      try {
        await startJob.mutateAsync({ jobId: entry.job.id, washerId });
      } catch (error) {
        Alert.alert('Could not start job', error instanceof Error ? error.message : 'Unknown error');
        return;
      }
    }
    router.push(`/washer/drying?jobId=${entry.job.id}`);
  };

  return (
    <RoleGuard roles={['washer', 'manager', 'admin']}>
      <Screen>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <BackButton />
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              Washing process
            </Text>
          </View>
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
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {entry.vehicle.make && entry.vehicle.model
              ? `${entry.vehicle.make} ${entry.vehicle.model}`
              : 'Vehicle registered'}
            {entry.job.priceCents ? ` · ${formatPesos(entry.job.priceCents)}` : ''}
          </Text>
        </Card>

        <View className="mt-6 items-center">
          <ProgressRing progress={progress} label="Washed" size={160} />
          <Text className="mt-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            {doneCount} of {WASH_CHECKLIST.length} steps done
          </Text>
        </View>

        <SectionHeader title="Wash checklist" />
        <Card>
          {WASH_CHECKLIST.map((step, index) => {
            const isChecked = checked[index];
            return (
              <Pressable
                key={step}
                onPress={() => toggle(index)}
                className={`mb-2 flex-row items-center gap-3 rounded-xl border px-4 py-3 last:mb-0 ${
                  isChecked
                    ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border ${
                    isChecked
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  {isChecked ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
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
          })}
        </Card>

        <View className="mt-6">
          <Button
            label="Continue to drying"
            icon="water-outline"
            onPress={handleNext}
            disabled={!canFinish || startJob.isPending}
            loading={startJob.isPending}
          />
          {!canFinish ? (
            <Text className="mt-2 text-center text-xs text-neutral-400 dark:text-neutral-500">
              This job is no longer in the washable state.
            </Text>
          ) : null}
        </View>
      </Screen>
    </RoleGuard>
  );
}