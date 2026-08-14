import { Text, View } from 'react-native';

import { brand } from '@/theme/colors';

interface ProgressRingProps {
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  label?: string;
}

/**
 * A progress ring built from two half-circle masks (overflow:hidden) rotated
 * independently so it renders 0–100% without an SVG dependency.
 */
export function ProgressRing({ progress, size = 140, strokeWidth = 12, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const half = size / 2;
  const circle = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: strokeWidth,
    borderColor: brand[600],
  } as const;

  // Left half covers 0→50%; right half covers 50→100%.
  const leftProgress = Math.min(1, clamped * 2);
  const rightProgress = Math.max(0, clamped * 2 - 1);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: '#E2E8F0',
        }}
      />
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              ...circle,
              top: 0,
              left: 0,
              transform: [{ rotate: `${-180 + leftProgress * 180}deg` }],
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              ...circle,
              top: 0,
              right: 0,
              transform: [{ rotate: `${rightProgress * 180}deg` }],
            }}
          />
        </View>
      </View>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text className="text-3xl font-black text-neutral-900 dark:text-white">
          {Math.round(clamped * 100)}%
        </Text>
        {label ? (
          <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}