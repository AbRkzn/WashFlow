import { ActivityIndicator, Modal, Pressable, Text } from 'react-native';

import { useWashers } from '@/data/queries';

export function WasherPicker({
  visible,
  title,
  subtitle,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onPick: (washerId: string) => void;
}) {
  const { data: washers, isLoading } = useWashers();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">{title}</Text>
          {subtitle ? (
            <Text className="mb-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </Text>
          ) : null}
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