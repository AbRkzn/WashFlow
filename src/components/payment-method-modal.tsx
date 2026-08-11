import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/domain/payment';

export function PaymentMethodModal({
  visible,
  amountCents,
  busy,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  amountCents: number;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full rounded-3xl bg-white p-5 dark:bg-neutral-900">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">
            Collect payment
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Choose the payment method.
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {PAYMENT_METHODS.map((option) => {
              const selected = option === method;
              return (
                <Pressable
                  key={option}
                  onPress={() => setMethod(option)}
                  className={`rounded-xl border px-4 py-3 ${
                    selected
                      ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                      : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected
                        ? 'text-brand-700 dark:text-brand-300'
                        : 'text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {PAYMENT_METHOD_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-4 flex-row items-center justify-between rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">Amount</Text>
            <Text className="text-lg font-bold text-neutral-900 dark:text-white">
              ₱{(amountCents / 100).toFixed(2)}
            </Text>
          </View>

          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onClose}
              disabled={busy}
              className="flex-1 items-center rounded-xl border border-neutral-200 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
            >
              <Text className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(method)}
              disabled={busy}
              className="flex-1 items-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-50"
            >
              <Text className="text-sm font-semibold text-white">Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
