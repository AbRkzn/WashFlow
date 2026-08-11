import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { PhotoViewerModal } from '@/components/photo-viewer-modal';
import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import {
  useAddJobPhoto,
  useApproveQuality,
  useClaimJob,
  useClaimNextJob,
  useJobPhotos,
  useMarkDone,
  useQueuedJobs,
  useStartJob,
  useWasherBoard,
} from '@/data/queries';
import type { QueueEntry } from '@/data/repositories';
import type { PhotoKind } from '@/data/schema';
import { JOB_STATUS_LABELS, type JobStatus } from '@/domain/job';
import { capturePhoto, pickPhotoFromLibrary } from '@/services/camera';
import { useSessionStore } from '@/stores/session-store';

const STATUS_CHIP: Record<JobStatus, string> = {
  queued: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  assigned: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  quality_check: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  voided: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

function JobCard({
  entry,
  buttonLabel,
  onButton,
  busy,
  enablePhotos,
  onAddPhoto,
  photoBusy,
}: {
  entry: QueueEntry;
  buttonLabel?: string;
  onButton?: () => void;
  busy?: boolean;
  enablePhotos?: boolean;
  onAddPhoto?: (kind: PhotoKind) => void;
  photoBusy?: boolean;
}) {
  const { data: photos } = useJobPhotos(enablePhotos ? entry.job.id : '');
  const [viewingKind, setViewingKind] = useState<PhotoKind | null>(null);
  const beforeCount = photos?.filter((photo) => photo.kind === 'before').length ?? 0;
  const afterCount = photos?.filter((photo) => photo.kind === 'after').length ?? 0;

  return (
    <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold tracking-widest text-neutral-900 dark:text-white">
          {entry.vehicle.plateNumber}
        </Text>
        <View className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
          <Text className={`text-xs font-semibold ${STATUS_CHIP[entry.job.status]}`}>
            {JOB_STATUS_LABELS[entry.job.status]}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        {entry.customer.name}
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        {entry.service?.name ?? 'Service'}
      </Text>

      {enablePhotos && onAddPhoto ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => (beforeCount > 0 ? setViewingKind('before') : onAddPhoto('before'))}
            disabled={photoBusy || beforeCount >= 2}
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-2 active:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:active:bg-neutral-800"
          >
            <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Before · {beforeCount}/2
            </Text>
          </Pressable>
          <Pressable
            onPress={() => (afterCount > 0 ? setViewingKind('after') : onAddPhoto('after'))}
            disabled={photoBusy || afterCount >= 2}
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-2 active:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:active:bg-neutral-800"
          >
            <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              After · {afterCount}/2
            </Text>
          </Pressable>
        </View>
      ) : null}

      <PhotoViewerModal
        visible={viewingKind !== null}
        onClose={() => setViewingKind(null)}
        photos={photos ?? []}
        jobLabel={`${entry.vehicle.plateNumber} · ${entry.customer.name}`}
        onAddPhoto={
          viewingKind && onAddPhoto ? () => onAddPhoto(viewingKind) : undefined
        }
        kind={viewingKind ?? undefined}
      />

      {buttonLabel && onButton ? (
        <Pressable
          onPress={onButton}
          disabled={busy}
          className="mt-3 rounded-xl bg-brand-600 px-4 py-2.5 active:bg-brand-700 disabled:opacity-50"
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-center text-sm font-semibold text-white">{buttonLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export default function WasherHome() {
  const user = useSessionStore((s) => s.user);
  const washerId = user?.id ?? '';

  const { data: myJobs, isLoading: myJobsLoading } = useWasherBoard(washerId);
  const { data: claimable, isLoading: claimableLoading } = useQueuedJobs();

  const claimNext = useClaimNextJob();
  const claim = useClaimJob();
  const start = useStartJob();
  const markDone = useMarkDone();
  const approve = useApproveQuality();
  const addPhoto = useAddJobPhoto();

  const busy =
    claimNext.isPending ||
    claim.isPending ||
    start.isPending ||
    markDone.isPending ||
    approve.isPending ||
    addPhoto.isPending;

  const reportError = (error: unknown) =>
    Alert.alert('Could not update job', error instanceof Error ? error.message : 'Something went wrong.');

  const onClaimNext = () => {
    claimNext
      .mutateAsync(washerId)
      .then((entry) =>
        Alert.alert(
          entry ? `Claimed · ${entry.vehicle.plateNumber}` : 'Queue is clear',
          entry ? 'Job added to your list.' : 'No jobs waiting right now.',
        ),
      )
      .catch(reportError);
  };

  const run =
    <TVars,>(mutation: { mutateAsync: (vars: TVars) => Promise<unknown> }, vars: TVars, success: string) =>
    () =>
      mutation.mutateAsync(vars).then(() => Alert.alert('Done', success)).catch(reportError);

  const onAddPhoto = (jobId: string, kind: PhotoKind) => {
    const add = (uri: string | null) => {
      if (!uri) return;
      addPhoto
        .mutateAsync({ jobId, kind, uri })
        .then(() => Alert.alert('Done', `${kind} photo added.`))
        .catch(reportError);
    };
    Alert.alert(`Add ${kind} photo`, undefined, [
      {
        text: 'Take photo',
        onPress: () => capturePhoto().then(add).catch(reportError),
      },
      {
        text: 'Choose from library',
        onPress: () => pickPhotoFromLibrary().then(add).catch(reportError),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <RoleGuard roles={['washer', 'manager', 'admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Job Queue</Text>

          <Pressable
            onPress={onClaimNext}
            disabled={busy}
            className="rounded-2xl bg-brand-600 px-4 py-4 active:bg-brand-700 disabled:opacity-50"
          >
            {claimNext.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-center text-lg font-bold text-white">Claim Next</Text>
            )}
          </Pressable>

          {myJobsLoading || claimableLoading ? (
            <View className="py-10">
              <ActivityIndicator color="#0891B2" />
            </View>
          ) : (
            <>
              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  My jobs · {(myJobs ?? []).length}
                </Text>
                {(myJobs ?? []).length === 0 ? (
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    Nothing assigned yet. Claim a job to get started.
                  </Text>
                ) : (
                  (myJobs ?? []).map((entry) => {
                    const actions: Record<string, { label: string; action: () => void }> = {
                      assigned: {
                        label: 'Start',
                        action: run(start, { jobId: entry.job.id, washerId }, 'Job started.'),
                      },
                      in_progress: {
                        label: 'Mark Done',
                        action: run(markDone, { jobId: entry.job.id, washerId }, 'Sent to quality check.'),
                      },
                      quality_check: {
                        label: 'Approve QC',
                        action: run(approve, { jobId: entry.job.id, actorId: washerId }, 'Job completed.'),
                      },
                    };
                    const action = actions[entry.job.status];
                    return (
                      <View key={entry.job.id} className="mb-3">
                        <JobCard
                          entry={entry}
                          buttonLabel={action?.label}
                          onButton={action?.action}
                          busy={busy}
                          enablePhotos={entry.job.status === 'assigned' || entry.job.status === 'in_progress'}
                          onAddPhoto={(kind) => onAddPhoto(entry.job.id, kind)}
                          photoBusy={addPhoto.isPending}
                        />
                      </View>
                    );
                  })
                )}
              </View>

              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Up for grabs · {(claimable ?? []).length}
                </Text>
                {(claimable ?? []).length === 0 ? (
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    Queue is clear. New check-ins will show up here.
                  </Text>
                ) : (
                  (claimable ?? []).map((entry) => (
                    <View key={entry.job.id} className="mb-3">
                      <JobCard
                        entry={entry}
                        buttonLabel="Claim"
                        onButton={run(claim, { jobId: entry.job.id, washerId }, 'Job claimed.')}
                        busy={busy}
                      />
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}
