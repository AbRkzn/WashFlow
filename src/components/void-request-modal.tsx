import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

interface VoidRequestModalProps {
  visible: boolean;
  title: string;
  plateNumber: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function VoidRequestModal({
  visible,
  title,
  plateNumber,
  busy = false,
  onClose,
  onConfirm,
}: VoidRequestModalProps) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={handleClose}>
        <Pressable className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">{title}</Text>
          <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {plateNumber}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (optional)"
            placeholderTextColor="#94A3B8"
            multiline
            className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
          />
          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={handleClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
            >
              <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={busy}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-red-600 px-4 py-3 active:bg-red-700 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-center text-sm font-semibold text-white">Void</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
