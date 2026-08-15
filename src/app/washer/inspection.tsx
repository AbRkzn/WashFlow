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
import { Screen } from '@/components/ui/screen';
import { useApproveQuality, useWasherBoard } from '@/data/queries';
import { useSessionStore } from '@/stores/session-store';

const INSPECTION_ITEMS = [
  { key: 'paint', label: 'Paint finish clean, no water spots', icon: 'color-palette-outline' },
  { key: 'windows', label: 'Windows streak-free', icon: 'scan-outline' },
  { key: 'interior', label: 'Interior vacuumed and wiped', icon: 'car-sport-outline' },
  { key: 'wheels', label: 'Wheels and tires clean', icon: 'ellipse-outline' },
  { key: 'trims', label: 'Trims and crevices dry', icon: 'construct-outline' },
] as const;

export default function QualityInspectionScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const washerId = useSessionStore((s) => s.user?.id ?? '');
  const actorId = washerId;
  const { data: myJobs, isLoading } = useWasherBoard(washerId);
  const approveQuality = useApproveQuality();

  const entry = myJobs?.find((item) => item.job.id === jobId);
  const [passed, setPassed] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) =>
    setPassed((current) => ({ ...current, [key]: !current[key] }));

  const passedCount = INSPECTION_ITEMS.filter((item) => passed[item.key]).length;
  const allPassed = passedCount === INSPECTION_ITEMS.length;
  const canApprove = entry?.job.status === 'quality_check' && allPassed;

  const handleApprove = async () => {
    if (!entry) return;
    try {
      await approveQuality.mutateAsync({ jobId: entry.job.id, actorId });
      router.back();
    } catch (error) {
      Alert.alert('Could not approve', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSendBack = () => {
    Alert.alert(
      'Send back to wash?',
      'This will notify the team that the vehicle needs rework.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send back',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
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
          <JobNotFound />
        </Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={['washer', 'manager', 'admin']}>
      <Screen>
        <View className="flex-row items-center gap-3">
          <BackButton />
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Quality inspection
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

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          Inspection checklist · {passedCount}/{INSPECTION_ITEMS.length}
        </Text>
        <Card>
          {INSPECTION_ITEMS.map((item) => {
            const isPassed = !!passed[item.key];
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleItem(item.key)}
                className={`mb-2 flex-row items-center gap-3 rounded-xl border px-4 py-3 last:mb-0 ${
                  isPassed
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border ${
                    isPassed
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  {isPassed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </View>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color="#0E7490" />
                <Text
                  className={`flex-1 text-sm font-semibold ${
                    isPassed
                      ? 'text-emerald-800 dark:text-emerald-200 line-through'
                      : 'text-neutral-800 dark:text-neutral-100'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </Card>

        {entry.job.status === 'quality_check' ? (
          <View className="mt-6 gap-3">
            <Button
              label="Approve — mark completed"
              icon="checkmark-circle-outline"
              onPress={handleApprove}
              disabled={!canApprove || approveQuality.isPending}
              loading={approveQuality.isPending}
            />
            <Button
              label="Send back to wash"
              icon="refresh-outline"
              variant="outline"
              onPress={handleSendBack}
            />
            {!allPassed ? (
              <Text className="text-center text-xs text-neutral-400 dark:text-neutral-500">
                Check every item before approving.
              </Text>
            ) : null}
          </View>
        ) : (
          <Text className="mt-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
            This job is not waiting for inspection.
          </Text>
        )}
      </Screen>
    </RoleGuard>
  );
}