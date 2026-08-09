import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Photo, PhotoKind } from '@/data/schema';

function PhotoGrid({ photos, title }: { photos: Photo[]; title: string }) {
  if (photos.length === 0) {
    return (
      <View className="rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
        <Text className="text-center text-sm text-neutral-400 dark:text-neutral-500">
          No {title.toLowerCase()} photos yet
        </Text>
      </View>
    );
  }
  return (
    <View>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {title} · {photos.length}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {photos.map((photo) => (
          <View
            key={photo.id}
            className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
          >
            <Image
              source={{ uri: photo.uri }}
              className="h-32 w-32"
              resizeMode="cover"
            />
            {photo.uploadedAt ? (
              <View className="absolute right-1 top-1 rounded-full bg-emerald-500 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-white">Synced</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function PhotoViewerModal({
  visible,
  onClose,
  photos,
  jobLabel,
  kind,
  onAddPhoto,
}: {
  visible: boolean;
  onClose: () => void;
  photos: Photo[];
  jobLabel: string;
  kind?: PhotoKind;
  onAddPhoto?: () => void;
}) {
  const before = photos.filter((photo) => photo.kind === 'before');
  const after = photos.filter((photo) => photo.kind === 'after');
  const showBefore = !kind || kind === 'before';
  const showAfter = !kind || kind === 'after';
  const addDisabled = kind === 'before' ? before.length >= 2 : after.length >= 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="max-h-[80%] rounded-t-3xl bg-white p-4 dark:bg-neutral-900"
        >
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">
                Job photos
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">{jobLabel}</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="rounded-full bg-neutral-100 px-3 py-1.5 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700"
            >
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Close
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            {showBefore ? <PhotoGrid photos={before} title="Before" /> : null}
            {showAfter ? <PhotoGrid photos={after} title="After" /> : null}
            {onAddPhoto ? (
              <Pressable
                onPress={onAddPhoto}
                disabled={addDisabled}
                className="rounded-xl bg-brand-600 px-4 py-2.5 active:bg-brand-700 disabled:opacity-40"
              >
                <Text className="text-center text-sm font-semibold text-white">
                  Add {kind ?? 'photo'}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
