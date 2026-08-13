import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

interface JobNotesModalProps {
  visible: boolean;
  title: string;
  initialNotes?: string | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export function JobNotesModal({
  visible,
  title,
  initialNotes,
  busy = false,
  onClose,
  onSave,
}: JobNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes ?? '');

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  const handleSave = () => {
    onSave(notes.trim());
    setNotes('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={handleClose}>
        <Pressable className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">{title}</Text>
          <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Notes show up on this job for washers.
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Interior shampoo requested, no tire shine"
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
              onPress={handleSave}
              disabled={busy}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-50"
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-center text-sm font-semibold text-white">Save</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}