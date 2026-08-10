import { ActivityIndicator, Modal, Pressable, Share, Text, View } from 'react-native';

import { formatPesosForReceipt, receiptLineItems, receiptText, type Receipt } from '@/domain/receipt';

export function ReceiptModal({
  visible,
  receipt,
  busy,
  onClose,
}: {
  visible: boolean;
  receipt: Receipt | null | undefined;
  busy?: boolean;
  onClose: () => void;
}) {
  async function handleShare() {
    if (!receipt) return;
    try {
      await Share.share({ message: receiptText(receipt) });
    } catch (error) {
      console.warn('Receipt share failed (non-fatal)', error);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full rounded-3xl bg-white p-5 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-neutral-900 dark:text-white">
              Official Receipt
            </Text>
            <View className="rounded-full bg-brand-100 px-2 py-0.5 dark:bg-brand-950">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                Paid
              </Text>
            </View>
          </View>

          {receipt ? (
            <>
              <Text className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {receipt.receiptNumber}
              </Text>

              <View className="mt-4 rounded-2xl border border-dashed border-neutral-200 p-4 dark:border-neutral-700">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-bold tracking-widest text-neutral-900 dark:text-white">
                    {receipt.plateNumber}
                  </Text>
                  <Text className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPesosForReceipt(receipt.amountCents)}
                  </Text>
                </View>
                <Text className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {receipt.customerName}
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  {receipt.serviceName}
                </Text>
                <View className="mt-4 gap-1.5">
                  {receiptLineItems(receipt).map((item) => (
                    <View key={item.label} className="flex-row items-center justify-between">
                      <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                        {item.label}
                      </Text>
                      <Text className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
                Collected by {receipt.receivedByName ?? '—'}
              </Text>
            </>
          ) : (
            <View className="mt-6 items-center py-8">
              <ActivityIndicator color="#0891B2" />
            </View>
          )}

          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onClose}
              disabled={busy}
              className="flex-1 items-center rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-700"
            >
              <Text className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                Close
              </Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              disabled={busy || !receipt}
              className="flex-1 items-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-50"
            >
              <Text className="text-sm font-semibold text-white">Share receipt</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
