import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search', onClear }: SearchBarProps) {
  return (
    <View className="flex-row items-center rounded-2xl border border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Ionicons name="search" size={18} color="#94A3B8" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        autoCorrect={false}
        className="flex-1 px-3 py-3.5 text-base text-neutral-900 dark:text-white"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={onClear ?? (() => onChangeText(''))}
          accessibilityLabel="Clear search"
          hitSlop={8}
          className="rounded-full p-1 active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <Ionicons name="close" size={16} color="#64748B" />
        </Pressable>
      ) : null}
    </View>
  );
}