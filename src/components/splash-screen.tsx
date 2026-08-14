import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/theme/colors';

/**
 * Premium splash shown while the local database boots. Displays the WashFlow
 * brand, an "offline first" badge and a subtle water treatment. No navigation —
 * the root layout swaps it out once `databaseReady` flips.
 */
export function SplashScreen() {
  return (
    <View style={styles.fill}>
      <LinearGradient colors={['#FFFFFF', '#ECFEFF', '#CFFAFE']} style={styles.fill}>
        <View className="flex-1 items-center justify-center px-10">
        <View className="mb-8 items-center">
          <View className="h-28 w-28 items-center justify-center rounded-[36px] shadow-lg shadow-brand-500/30">
            <LinearGradient
              colors={[brand[400], brand[600], brand[800]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-full w-full items-center justify-center rounded-[36px]"
            >
              <Text className="text-5xl font-black text-white">W</Text>
            </LinearGradient>
          </View>
          <Text className="mt-8 text-4xl font-black tracking-tight">
            <Text className="text-neutral-900 dark:text-neutral-100">Wash</Text>
            <Text className="text-brand-600">Flow</Text>
          </Text>
          <Text className="mt-2 text-center text-base font-medium text-neutral-500 dark:text-neutral-400">
            Car Wash Management System
          </Text>
        </View>

        <View className="mt-10 flex-row items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-4 py-2 dark:border-brand-900 dark:bg-brand-950/50">
          <Text className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">
            Offline First
          </Text>
        </View>

        <Text className="mt-10 text-center text-sm font-semibold tracking-wide text-neutral-400 dark:text-neutral-500">
          Manage. Track. Grow.
        </Text>
      </View>

      <ActivityIndicator
        size="small"
        color={brand[600]}
        style={styles.indicator}
      />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    bottom: 64,
    alignSelf: 'center',
  },
});