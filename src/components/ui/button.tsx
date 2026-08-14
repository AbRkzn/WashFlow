import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-brand-100 active:bg-brand-200 dark:bg-brand-950 dark:active:bg-brand-900',
  outline:
    'border border-neutral-300 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800',
  ghost: 'active:bg-neutral-100 dark:active:bg-neutral-800',
  danger: 'bg-red-600 active:bg-red-700',
};

const LABEL_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-brand-800 dark:text-brand-200',
  outline: 'text-neutral-700 dark:text-neutral-200',
  ghost: 'text-brand-700 dark:text-brand-300',
  danger: 'text-white',
};

const SIZE_CLASSES = {
  sm: 'px-4 py-2',
  md: 'px-5 py-3.5',
  lg: 'px-6 py-4',
} as const;

const LABEL_SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  fullWidth = true,
  size = 'md',
}: ButtonProps) {
  const disabledClass = disabled || loading ? 'opacity-50' : '';
  const widthClass = fullWidth ? 'w-full' : 'self-start';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-2xl ${widthClass} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${disabledClass}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#0891B2' : '#FFFFFF'} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color="currentColor" /> : null}
          <Text className={`font-semibold ${LABEL_SIZE_CLASSES[size]} ${LABEL_CLASSES[variant]}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}