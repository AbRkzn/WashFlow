import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

const VOID_REASON_PRESETS = [
  'Wrong plate / vehicle',
  'Duplicate entry',
  'Customer left',
  'Damaged in process',
  'Wrong service selected',
  'No-show walk-in',
] as const;

interface VoidRequestModalProps {
  visible: boolean;
  title: string;
  plateNumber: string;
  busy?: boolean;
  requireReason?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function VoidRequestModal({
  visible,
  title,
  plateNumber,
  busy = false,
  requireReason = false,
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

  const canConfirm = !requireReason || reason.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={handleClose}>
        <Pressable className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">{title}</Text>
          <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {plateNumber}
          </Text>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {VOID_REASON_PRESETS.map((preset) => {
              const selected = reason === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setReason(selected ? '' : preset)}
                  className={`rounded-xl border px-3 py-2 active:opacity-80 ${
                    selected
                      ? 'border-red-600 bg-red-50 dark:border-red-400 dark:bg-red-950'
                      : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? 'text-red-700 dark:text-red-300' : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={requireReason ? 'Reason (required)' : 'Reason (optional)'}
            placeholderTextColor="#94A3B8"
            multiline
            className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
          />
          {requireReason && reason.trim().length === 0 ? (
            <Text className="mt-1 text-xs text-red-600 dark:text-red-400">
              A reason is required for day-close reporting.
            </Text>
          ) : null}
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
              disabled={busy || !canConfirm}
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
