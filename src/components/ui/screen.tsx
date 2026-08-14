import type { PropsWithChildren } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scroll = true, padded = true, style }: ScreenProps) {
  const content = (
    <View className={padded ? 'px-5' : ''} style={style}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View className="flex-1">
          <View className={padded ? 'flex-1 px-5' : 'flex-1'} style={style}>
            {children}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}