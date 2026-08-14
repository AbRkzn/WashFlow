import { Text, TextInput, View } from 'react-native';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address' | 'decimal-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  hint?: string;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  multiline = false,
  hint,
}: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        className={`rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white ${
          multiline ? 'min-h-[96px] text-left' : ''
        }`}
      />
      {hint ? (
        <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{hint}</Text>
      ) : null}
    </View>
  );
}