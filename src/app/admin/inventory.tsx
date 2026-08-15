import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { ScreenHeader } from '@/components/screen-header';
import {
  useAdjustStock,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useInventory,
  useLowStockItems,
} from '@/data/queries';
import {
  ADJUSTMENT_TYPES,
  ADJUSTMENT_TYPE_LABELS,
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  isLowStock,
  type AdjustmentType,
  type InventoryCategory,
} from '@/domain/inventory';
import { useSessionStore } from '@/stores/session-store';

interface ItemFormState {
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: string;
  lowStockThreshold: string;
}

interface AdjustmentFormState {
  changeQty: string;
  type: AdjustmentType;
  reason: string;
  cost: string;
}

const emptyItemForm: ItemFormState = {
  name: '',
  category: 'supplies',
  unit: 'pc',
  quantity: '0',
  lowStockThreshold: '',
};

const emptyAdjustmentForm: AdjustmentFormState = {
  changeQty: '',
  type: 'restock',
  reason: '',
  cost: '',
};

const QUANTITY_PRESETS = [1, 2, 3, 5, 10, 20] as const;

const REASON_PRESETS: Record<AdjustmentType, string[]> = {
  restock: ['New delivery', 'Supplier restock'],
  usage: ['Used on job', 'Daily usage'],
  waste: ['Damaged', 'Expired', 'Spilled'],
  correction: ['Inventory count', 'Found on hand'],
};

const COST_PRESETS = [100, 200, 500, 1000, 2000] as const;

export default function AdminInventoryScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: items, isLoading, isRefetching, refetch } = useInventory();
  const lowStockItems = useLowStockItems();
  const createItem = useCreateInventoryItem();
  const adjustStock = useAdjustStock();
  const deleteItem = useDeleteInventoryItem();

  const [addOpen, setAddOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);

  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(emptyAdjustmentForm);

  const itemsList = items ?? [];
  const lowCount = (lowStockItems.data ?? []).length;
  const adjustingItem = itemsList.find((item) => item.id === adjustingItemId) ?? null;

  const itemName = itemForm.name.trim();
  const parsedQty = parseInt(itemForm.quantity, 10);
  const parsedThreshold =
    itemForm.lowStockThreshold.trim() === '' ? null : parseInt(itemForm.lowStockThreshold, 10);
  const canAddItem = itemName.length > 0 && !createItem.isPending;

  const handleCloseAdd = () => {
    setItemForm(emptyItemForm);
    setAddOpen(false);
  };

  const handleSaveItem = () => {
    if (!canAddItem) return;
    createItem
      .mutateAsync({
        values: {
          name: itemName,
          category: itemForm.category,
          unit: itemForm.unit.trim() || 'pc',
          quantity: Number.isFinite(parsedQty) ? Math.max(0, parsedQty) : 0,
          lowStockThreshold: parsedThreshold ?? null,
        },
        actorId,
      })
      .then(() => handleCloseAdd())
      .catch((error) =>
        Alert.alert('Failed to add item', error instanceof Error ? error.message : 'Something went wrong.'),
      );
  };

  const handleCloseAdjust = () => {
    setAdjustmentForm(emptyAdjustmentForm);
    setAdjustingItemId(null);
  };

  const handleSaveAdjustment = () => {
    if (!adjustingItemId) return;
    const changeQty = parseInt(adjustmentForm.changeQty, 10);
    if (!Number.isFinite(changeQty) || changeQty === 0) {
      Alert.alert('Invalid quantity', 'Enter a non-zero whole number.');
      return;
    }
    const type = adjustmentForm.type;
    const signedQty = type === 'restock' || type === 'correction' ? changeQty : -Math.abs(changeQty);
    const costCents =
      type === 'restock' && adjustmentForm.cost.trim() !== ''
        ? Math.round(Number(adjustmentForm.cost.replace(/,/g, '')) * 100)
        : undefined;
    if (type === 'restock' && costCents !== undefined && (!Number.isFinite(costCents) || costCents <= 0)) {
      Alert.alert('Invalid cost', 'Enter a valid positive restock cost.');
      return;
    }
    adjustStock
      .mutateAsync({
        itemId: adjustingItemId,
        changeQty: signedQty,
        type,
        actorId,
        reason: adjustmentForm.reason.trim() || undefined,
        costCents,
      })
      .then(() => handleCloseAdjust())
      .catch((error) =>
        Alert.alert('Adjustment failed', error instanceof Error ? error.message : 'Something went wrong.'),
      );
  };

  const handleDelete = (itemId: string, name: string) => {
    Alert.alert('Delete item', `Remove "${name}" from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteItem
            .mutateAsync({ itemId, actorId })
            .catch((error) =>
              Alert.alert('Delete failed', error instanceof Error ? error.message : 'Something went wrong.'),
            );
        },
      },
    ]);
  };

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <ScreenHeader
          title="Inventory"
          right={
            <Pressable
              onPress={() => setAddOpen(true)}
              className="flex-row items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 active:bg-brand-700"
            >
              <Text className="text-sm font-semibold text-white">Add item</Text>
            </Pressable>
          }
        />

        {lowCount > 0 ? (
          <View className="mx-4 mb-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <Text className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Low stock alert · {lowCount}
            </Text>
            <Text className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              {lowStockItems.data
                ?.map((item) => `${item.name} (${item.quantity} ${item.unit})`)
                .join(', ')}
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : itemsList.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">No items yet</Text>
            <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
              Track cleaning supplies, chemicals, and tools here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={itemsList}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => {
              const low = isLowStock(item);
              return (
                <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                        {item.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                        {INVENTORY_CATEGORY_LABELS[item.category]} · per {item.unit}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`text-xl font-bold ${
                          low ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {item.quantity}
                        <Text className="text-xs font-medium text-neutral-400"> {item.unit}</Text>
                      </Text>
                      {item.lowStockThreshold !== null ? (
                        <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                          min {item.lowStockThreshold}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        setAdjustmentForm(emptyAdjustmentForm);
                        setAdjustingItemId(item.id);
                      }}
                      className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 active:bg-brand-700"
                    >
                      <Text className="text-sm font-semibold text-white">Adjust stock</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(item.id, item.name)}
                      className="rounded-xl border border-red-200 px-3 py-2.5 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
                    >
                      <Text className="text-sm font-semibold text-red-600 dark:text-red-400">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}

        <Modal visible={addOpen} animationType="slide" transparent onRequestClose={handleCloseAdd}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">Add inventory item</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Name
                </Text>
                <TextInput
                  value={itemForm.name}
                  onChangeText={(name) => setItemForm((f) => ({ ...f, name }))}
                  placeholder="e.g. Car shampoo"
                  placeholderTextColor="#94A3B8"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Category
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {INVENTORY_CATEGORIES.map((key) => {
                    const selected = key === itemForm.category;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setItemForm((f) => ({ ...f, category: key }))}
                        className={`rounded-xl border px-3 py-2 active:opacity-80 ${
                          selected
                            ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {INVENTORY_CATEGORY_LABELS[key]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Unit
                    </Text>
                    <TextInput
                      value={itemForm.unit}
                      onChangeText={(unit) => setItemForm((f) => ({ ...f, unit }))}
                      placeholder="pc, L, bottle"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Starting qty
                    </Text>
                    <TextInput
                      value={itemForm.quantity}
                      onChangeText={(quantity) => setItemForm((f) => ({ ...f, quantity }))}
                      keyboardType="number-pad"
                      className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                  </View>
                </View>

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Low-stock threshold (optional)
                </Text>
                <TextInput
                  value={itemForm.lowStockThreshold}
                  onChangeText={(lowStockThreshold) => setItemForm((f) => ({ ...f, lowStockThreshold }))}
                  placeholder="Alert when at or below this quantity"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                <View className="mt-4 flex-row gap-2">
                  <Pressable
                    onPress={handleCloseAdd}
                    disabled={createItem.isPending}
                    className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                  >
                    <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveItem}
                    disabled={!canAddItem}
                    className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-40"
                  >
                    {createItem.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-sm font-semibold text-white">Add item</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={adjustingItem !== null}
          animationType="slide"
          transparent
          onRequestClose={handleCloseAdjust}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">
                Adjust stock · {adjustingItem?.name}
              </Text>
              <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Current: {adjustingItem?.quantity ?? 0} {adjustingItem?.unit}
              </Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ADJUSTMENT_TYPES.map((key) => {
                    const selected = key === adjustmentForm.type;
                    return (
                      <Pressable
                        key={key}
                        onPress={() =>
                          setAdjustmentForm((f) => ({ ...f, type: key, reason: '', cost: '' }))
                        }
                        className={`rounded-xl border px-3 py-2 active:opacity-80 ${
                          selected
                            ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {ADJUSTMENT_TYPE_LABELS[key]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {adjustmentForm.type === 'restock' || adjustmentForm.type === 'correction'
                    ? 'Quantity change (positive to add)'
                    : 'Quantity used/lost'}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {QUANTITY_PRESETS.map((qty) => {
                    const selected = adjustmentForm.changeQty === String(qty);
                    return (
                      <Pressable
                        key={qty}
                        onPress={() =>
                          setAdjustmentForm((f) => ({
                            ...f,
                            changeQty: selected ? '' : String(qty),
                          }))
                        }
                        className={`w-16 rounded-xl border px-3 py-3 active:opacity-80 ${
                          selected
                            ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                        }`}
                      >
                        <Text
                          className={`text-center text-base font-bold ${
                            selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {qty}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={adjustmentForm.changeQty}
                  onChangeText={(changeQty) => setAdjustmentForm((f) => ({ ...f, changeQty }))}
                  keyboardType="number-pad"
                  placeholder="Or type a custom quantity"
                  placeholderTextColor="#94A3B8"
                  className="mt-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />
                {adjustmentForm.changeQty === '' ? (
                  <Text className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Pick or type a quantity to continue.
                  </Text>
                ) : null}

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Reason (optional)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {REASON_PRESETS[adjustmentForm.type].map((reason) => {
                    const selected = adjustmentForm.reason === reason;
                    return (
                      <Pressable
                        key={reason}
                        onPress={() =>
                          setAdjustmentForm((f) => ({ ...f, reason: selected ? '' : reason }))
                        }
                        className={`rounded-xl border px-3 py-2 active:opacity-80 ${
                          selected
                            ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {reason}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={adjustmentForm.reason}
                  onChangeText={(reason) => setAdjustmentForm((f) => ({ ...f, reason }))}
                  placeholder="Or type a custom reason"
                  placeholderTextColor="#94A3B8"
                  className="mt-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                {adjustmentForm.type === 'restock' ? (
                  <>
                    <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Restock cost (optional)
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {COST_PRESETS.map((cents) => {
                        const selected = adjustmentForm.cost === String(cents);
                        return (
                          <Pressable
                            key={cents}
                            onPress={() =>
                              setAdjustmentForm((f) => ({ ...f, cost: selected ? '' : String(cents) }))
                            }
                            className={`rounded-xl border px-3 py-2 active:opacity-80 ${
                              selected
                                ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                            }`}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                selected
                                  ? 'text-brand-800 dark:text-brand-200'
                                  : 'text-neutral-900 dark:text-white'
                              }`}
                            >
                              ₱{cents}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={adjustmentForm.cost}
                      onChangeText={(cost) => setAdjustmentForm((f) => ({ ...f, cost }))}
                      keyboardType="decimal-pad"
                      placeholder="Or type a custom cost"
                      placeholderTextColor="#94A3B8"
                      className="mt-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                    <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Restocks are logged as a Supplies expense in today&apos;s report.
                    </Text>
                  </>
                ) : null}

                <View className="mt-4 flex-row gap-2">
                  <Pressable
                    onPress={handleCloseAdjust}
                    disabled={adjustStock.isPending}
                    className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                  >
                    <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveAdjustment}
                    disabled={adjustStock.isPending}
                    className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-40"
                  >
                    {adjustStock.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-sm font-semibold text-white">Save</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}
