import { Text, View } from 'react-native';

import { formatPesos } from '@/utils/money';

export function StatRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text
        className={`text-base font-semibold ${negative ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-white'}`}
      >
        {value}
      </Text>
    </View>
  );
}

/** Parses a stored JSON method-breakdown string into a cents map. */
export function parseMethodBreakdown(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function MethodBreakdown({
  breakdown,
  showTotal,
}: {
  breakdown: Record<string, number>;
  showTotal?: boolean;
}) {
  const entries = Object.entries(breakdown).filter(([, cents]) => cents > 0);
  if (entries.length === 0) {
    return <StatRow label="By method" value={formatPesos(0)} />;
  }
  const total = entries.reduce((sum, [, cents]) => sum + cents, 0);
  return (
    <View className="py-2">
      <Text className="mb-1 text-sm text-neutral-500 dark:text-neutral-400">By method</Text>
      {entries.map(([method, cents]) => (
        <View key={method} className="flex-row items-center justify-between py-0.5 pl-3">
          <Text className="text-sm capitalize text-neutral-600 dark:text-neutral-300">{method}</Text>
          <Text className="text-sm font-medium text-neutral-900 dark:text-white">
            {formatPesos(cents)}
          </Text>
        </View>
      ))}
      {showTotal ? (
        <View className="mt-1 flex-row items-center justify-between border-t border-neutral-100 pl-3 pt-1 dark:border-neutral-800">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Total</Text>
          <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
            {formatPesos(total)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
