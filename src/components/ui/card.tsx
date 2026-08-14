import type { PropsWithChildren } from 'react';
import { View, type ViewStyle } from 'react-native';

interface CardProps extends PropsWithChildren {
  className?: string;
  style?: ViewStyle;
  muted?: boolean;
}

export function Card({ children, className = '', style, muted = false }: CardProps) {
  return (
    <View
      className={`rounded-3xl border p-5 ${
        muted
          ? 'border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900'
          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      } ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}