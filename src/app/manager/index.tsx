import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { useForceAssign, useReassignJob, useReleaseJob, useWashers, useWorkingBoard } from '@/data/queries';
import type { WorkingEntry } from '@/services/jobs';
import { JOB_STATUS_LABELS, type JobStatus, WORKING_STATUSES } from '@/domain/job';
import { useSessionStore } from '@/stores/session-store';
import { formatPesos } from '@/utils/money';
import { formatClockTime } from '@/utils/time';

interface PickTarget {
  job: WorkingEntry;
  mode: 'assign' | 'reassign';
}

function WasherPicker({
  visible,
  target,
  onClose,
  onPick,
}: {
  visible: boolean;
  target: PickTarget | null;
  onClose: () => void;
  onPick: (washerId: string) => void;
}) {
  const { data: washers, isLoading } = useWashers();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">
            {target?.mode === 'reassign' ? 'Reassign to washer' : 'Assign to washer'}
          </Text>
          <Text className="mb-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {target?.job.vehicle.plateNumber} · {target?.job.service?.name ?? 'Service'}
          </Text>
          {isLoading ? (
            <ActivityIndicator color="#0891B2" className="py-6" />
          ) : (washers ?? []).length === 0 ? (
            <Text className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No washers on file yet. Washers appear here after their first sign-in.
            </Text>
          ) : (
            (washers ?? []).map((washer) => (
              <Pressable
                key={washer.id}
                onPress={() => onPick(washer.id)}
                className="mb-2 rounded-xl border border-neutral-200 p-4 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800"
              >
                <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                  {washer.name}
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">{washer.email}</Text>
              </Pressable>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ManagerHome() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: board } = useWorkingBoard();

  const forceAssign = useForceAssign();
  const reassignJob = useReassignJob();
  const releaseJob = useReleaseJob();

  const [picking, setPicking] = useState<PickTarget | null>(null);
  const busy = forceAssign.isPending || reassignJob.isPending || releaseJob.isPending;

  const reportError = (error: unknown) =>
    Alert.alert('Action failed', error instanceof Error ? error.message : 'Something went wrong.');

  const onPickWasher = (washerId: string) => {
    if (!picking) return;
    const { job, mode } = picking;
    setPicking(null);
    if (mode === 'reassign') {
      reassignJob
        .mutateAsync({ jobId: job.job.id, washerId, actorId })
        .then(() => Alert.alert('Done', 'Job reassigned.'))
        .catch(reportError);
    } else {
      forceAssign
        .mutateAsync({ jobId: job.job.id, washerId, actorId })
        .then(() => Alert.alert('Done', 'Job assigned.'))
        .catch(reportError);
    }
  };

  const onRelease = (jobId: string) => {
    releaseJob
      .mutateAsync({ jobId, actorId })
      .then(() => Alert.alert('Done', 'Job released back to the queue.'))
      .catch(reportError);
  };

  const sections = WORKING_STATUSES.map((status: JobStatus) => ({
    status,
    entries: (board ?? []).filter((e) => e.job.status === status),
  }));

  return (
    <RoleGuard roles={['manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Day Board</Text>

          {sections.every((s) => s.entries.length === 0) ? (
            <View className="mt-16 items-center">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">No active jobs</Text>
              <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                New check-ins and assigned jobs will appear here.
              </Text>
            </View>
          ) : null}

          {sections.map((section) =>
            section.entries.length === 0 ? null : (
              <View key={section.status} className="mt-5">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  {JOB_STATUS_LABELS[section.status]} · {section.entries.length}
                </Text>
                {section.entries.map((entry) => (
                  <View
                    key={entry.job.id}
                    className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xl font-bold tracking-widest text-neutral-900 dark:text-white">
                        {entry.vehicle.plateNumber}
                      </Text>
                      <Text className="text-sm text-neutral-400 dark:text-neutral-500">
                        {formatClockTime(entry.job.createdAt)}
                      </Text>
                    </View>
                    <Text className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {entry.customer.name}
                    </Text>
                    <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                      {entry.service?.name ?? 'Service'} · {formatPesos(entry.service?.priceCents ?? entry.job.priceCents)}
                    </Text>
                    <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                      {entry.assignedName ? `Assigned to ${entry.assignedName}` : 'Unassigned'}
                    </Text>

                    <View className="mt-3 flex-row gap-2">
                      {section.status === 'queued' ? (
                        <Pressable
                          onPress={() => setPicking({ job: entry, mode: 'assign' })}
                          disabled={busy}
                          className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 active:bg-brand-700 disabled:opacity-50"
                        >
                          <Text className="text-center text-sm font-semibold text-white">Assign</Text>
                        </Pressable>
                      ) : (
                        <>
                          <Pressable
                            onPress={() => setPicking({ job: entry, mode: 'reassign' })}
                            disabled={busy}
                            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 active:bg-brand-700 disabled:opacity-50"
                          >
                            <Text className="text-center text-sm font-semibold text-white">Reassign</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => onRelease(entry.job.id)}
                            disabled={busy}
                            className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                          >
                            <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                              Release
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ),
          )}
        </ScrollView>

        <WasherPicker
          visible={picking !== null}
          target={picking}
          onClose={() => setPicking(null)}
          onPick={onPickWasher}
        />
      </SafeAreaView>
    </RoleGuard>
  );
}
