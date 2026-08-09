import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { VoidRequestModal } from '@/components/void-request-modal';
import {
  useApproveVoidRequest,
  useDayClose,
  useForceAssign,
  usePendingConflicts,
  usePendingVoidRequests,
  useReassignJob,
  useRejectVoidRequest,
  useReleaseJob,
  useResolveConflict,
  useVoidJobAsManager,
  useWashers,
  useWorkingBoard,
} from '@/data/queries';
import type { WorkingEntry } from '@/services/jobs';
import { parseConflictRow } from '@/services/conflicts';
import { JOB_STATUS_LABELS, type JobStatus, WORKING_STATUSES } from '@/domain/job';
import { CONFLICT_KIND_LABELS } from '@/domain/conflict';
import { dateKey } from '@/domain/day-close';
import type { ConflictReviewEntry } from '@/data/repositories';
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

const IGNORED_COLUMNS = new Set([
  'id',
  'version',
  'server_seq',
  'origin_device',
  'created_at',
  'updated_at',
  'deleted_at',
]);

function RowValue({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </Text>
      <Text className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-100">{value}</Text>
    </View>
  );
}

function ConflictDetailModal({
  entry,
  onClose,
}: {
  entry: ConflictReviewEntry | null;
  onClose: () => void;
}) {
  const local = entry ? parseConflictRow(entry.conflict.localRow) : null;
  const remote = entry ? parseConflictRow(entry.conflict.remoteRow) : null;

  const renderRow = (row: Record<string, unknown> | null) =>
    row ? (
      Object.entries(row)
        .filter(([key]) => !IGNORED_COLUMNS.has(key))
        .map(([key, value]) => (
          <RowValue key={key} label={key.replaceAll('_', ' ')} value={String(value)} />
        ))
    ) : (
      <Text className="text-sm italic text-neutral-500 dark:text-neutral-400">Not available</Text>
    );

  return (
    <Modal visible={entry !== null} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="max-h-[85%] rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">
            {entry ? CONFLICT_KIND_LABELS[entry.conflict.kind] : ''}
          </Text>
          {entry?.conflict.description ? (
            <Text className="mb-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {entry.conflict.description}
            </Text>
          ) : null}
          {entry?.payment ? (
            <RowValue label="Payment amount" value={formatPesos(entry.payment.amountCents)} />
          ) : null}
          <ScrollView className="mt-3">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Local version
            </Text>
            {renderRow(local)}
            <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Remote (server) version
            </Text>
            {renderRow(remote)}
          </ScrollView>
          <Pressable
            onPress={onClose}
            className="mt-4 rounded-xl border border-neutral-300 px-4 py-2.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
          >
            <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Close
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ManagerHome() {
  const router = useRouter();
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: board } = useWorkingBoard();
  const { data: pendingVoids = [] } = usePendingVoidRequests();
  const { data: pendingConflicts = [] } = usePendingConflicts();
  const { data: todayClose } = useDayClose(dateKey());

  const forceAssign = useForceAssign();
  const reassignJob = useReassignJob();
  const releaseJob = useReleaseJob();
  const voidJobAsManager = useVoidJobAsManager();
  const approveVoid = useApproveVoidRequest();
  const rejectVoid = useRejectVoidRequest();
  const resolveConflict = useResolveConflict();

  const [picking, setPicking] = useState<PickTarget | null>(null);
  const [detailConflict, setDetailConflict] = useState<ConflictReviewEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkingEntry | null>(null);
  const busy =
    forceAssign.isPending ||
    reassignJob.isPending ||
    releaseJob.isPending ||
    voidJobAsManager.isPending;

  const reportError = (error: unknown) =>
    Alert.alert('Action failed', error instanceof Error ? error.message : 'Something went wrong.');

  const onApproveVoid = (requestId: string) => {
    approveVoid
      .mutateAsync({ requestId, managerId: actorId })
      .then(() => Alert.alert('Done', 'Void approved. Job voided.'))
      .catch(reportError);
  };

  const onRejectVoid = (requestId: string) => {
    rejectVoid
      .mutateAsync({ requestId, managerId: actorId })
      .then(() => Alert.alert('Done', 'Void request rejected.'))
      .catch(reportError);
  };

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

  const onDeleteJob = (reason: string) => {
    if (!deleteTarget) return;
    const { job } = deleteTarget;
    setDeleteTarget(null);
    voidJobAsManager
      .mutateAsync({ jobId: job.id, actorId, reason })
      .then(() => Alert.alert('Done', 'Job deleted (voided).'))
      .catch(reportError);
  };

  const onResolveConflict = (conflictId: string, resolution: 'approved' | 'rejected') => {
    const apply = () =>
      resolveConflict
        .mutateAsync({ conflictId, resolution, managerId: actorId })
        .then(() =>
          Alert.alert(
            'Done',
            resolution === 'approved' ? 'Remote version kept.' : 'Local version kept.',
          ),
        )
        .catch(reportError);

    if (resolution === 'approved') {
      Alert.alert(
        'Keep remote version?',
        'The server version will overwrite the local data and the queued local change will be dropped.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Keep remote', style: 'destructive', onPress: apply }],
      );
    } else {
      Alert.alert(
        'Keep local version?',
        'The local change stays queued and will overwrite the server on the next sync.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Keep local', onPress: apply }],
      );
    }
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

          <Pressable
            onPress={() => router.push('/manager/day-close')}
            className="mt-3 flex-row items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 active:opacity-80 dark:border-brand-900 dark:bg-brand-950"
          >
            <Text className="text-base font-semibold text-brand-800 dark:text-brand-200">
              {todayClose ? "View today's report" : 'Close day'}
            </Text>
            <Text className="text-sm font-medium text-brand-600 dark:text-brand-400">
              {todayClose ? 'Closed' : 'Open'}
            </Text>
          </Pressable>

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
                          <Pressable
                            onPress={() => setDeleteTarget(entry)}
                            disabled={busy}
                            className="flex-1 rounded-xl border border-red-300 px-4 py-2.5 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
                          >
                            <Text className="text-center text-sm font-semibold text-red-600 dark:text-red-400">
                              Delete
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

          {pendingVoids.length > 0 ? (
            <View className="mt-6">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-400 dark:text-red-500">
                Void approvals · {pendingVoids.length}
              </Text>
              {pendingVoids.map((entry) => (
                <View
                  key={entry.request.id}
                  className="mb-3 rounded-2xl border border-red-200 bg-white p-4 dark:border-red-900 dark:bg-neutral-900"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xl font-bold tracking-widest text-neutral-900 dark:text-white">
                      {entry.vehicle.plateNumber}
                    </Text>
                    <Text className="text-sm text-neutral-400 dark:text-neutral-500">
                      {formatClockTime(entry.request.createdAt)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    {entry.customer.name} · {entry.service?.name ?? 'Service'} ·{' '}
                    {formatPesos(entry.service?.priceCents ?? entry.job.priceCents)}
                  </Text>
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    Requested by {entry.requesterName ?? 'staff'}
                  </Text>
                  {entry.request.reason ? (
                    <Text className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {entry.request.reason}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => onApproveVoid(entry.request.id)}
                      disabled={approveVoid.isPending || rejectVoid.isPending}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 active:bg-red-700 disabled:opacity-50"
                    >
                      <Text className="text-center text-sm font-semibold text-white">Approve void</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onRejectVoid(entry.request.id)}
                      disabled={approveVoid.isPending || rejectVoid.isPending}
                      className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                    >
                      <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                        Reject
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {pendingConflicts.length > 0 ? (
            <View className="mt-6">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-500">
                Sync conflicts · {pendingConflicts.length}
              </Text>
              {pendingConflicts.map((entry) => (
                <View
                  key={entry.conflict.id}
                  className="mb-3 rounded-2xl border border-amber-300 bg-white p-4 dark:border-amber-900 dark:bg-neutral-900"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-neutral-900 dark:text-white">
                      {CONFLICT_KIND_LABELS[entry.conflict.kind]}
                    </Text>
                    <Text className="text-sm text-neutral-400 dark:text-neutral-500">
                      {formatClockTime(entry.conflict.createdAt)}
                    </Text>
                  </View>
                  {entry.payment ? (
                    <Text className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      Payment of {formatPesos(entry.payment.amountCents)}
                    </Text>
                  ) : null}
                  {entry.conflict.description ? (
                    <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {entry.conflict.description}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => setDetailConflict(entry)}
                      className="rounded-xl border border-neutral-300 px-4 py-2.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                    >
                      <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                        Details
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onResolveConflict(entry.conflict.id, 'approved')}
                      disabled={resolveConflict.isPending}
                      className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 active:bg-amber-700 disabled:opacity-50"
                    >
                      <Text className="text-center text-sm font-semibold text-white">Keep remote</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onResolveConflict(entry.conflict.id, 'rejected')}
                      disabled={resolveConflict.isPending}
                      className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                    >
                      <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                        Keep local
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <ConflictDetailModal entry={detailConflict} onClose={() => setDetailConflict(null)} />

        <WasherPicker
          visible={picking !== null}
          target={picking}
          onClose={() => setPicking(null)}
          onPick={onPickWasher}
        />

        <VoidRequestModal
          visible={deleteTarget !== null}
          title="Delete job?"
          plateNumber={deleteTarget?.vehicle.plateNumber ?? ''}
          busy={voidJobAsManager.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={onDeleteJob}
        />
      </SafeAreaView>
    </RoleGuard>
  );
}
