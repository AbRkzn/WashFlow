import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLoadDemoData } from '@/data/queries';
import { useSessionStore } from '@/stores/session-store';
import { ROLE_HOME_ROUTES } from '@/utils/routes';
import { brand } from '@/theme/colors';

export default function SignInScreen() {
  const user = useSessionStore((s) => s.user);
  const signIn = useSessionStore((s) => s.signIn);
  const loadDemo = useLoadDemoData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Redirect href={ROLE_HOME_ROUTES[user.role]} />;
  }

  const isNetworkError = (message: string) =>
    /network|fetch failed|unreachable|timeout/i.test(message);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign-in failed.';
      setError(isNetworkError(message) ? 'No connection. Sign-in requires the network.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-7">
          <LinearGradient
            colors={[brand[50], '#FFFFFF']}
            className="absolute inset-x-0 top-0 h-72"
          />

          <View className="mt-14 items-center">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-[28px] shadow-lg shadow-brand-500/25">
              <LinearGradient
                colors={[brand[400], brand[600], brand[800]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-full w-full items-center justify-center rounded-[28px]"
              >
                <Text className="text-4xl font-black text-white">W</Text>
              </LinearGradient>
            </View>
            <Text className="text-3xl font-black tracking-tight">
              <Text className="text-neutral-900 dark:text-white">Wash</Text>
              <Text className="text-brand-600">Flow</Text>
            </Text>
            <Text className="mt-3 text-center text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              Welcome back
            </Text>
            <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Sign in to continue. Internet is required to sign in.
            </Text>
          </View>

          <View className="mt-8 gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-base text-neutral-900 shadow-sm shadow-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              textContentType="password"
              className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-base text-neutral-900 shadow-sm shadow-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            />
          </View>

          {error ? (
            <Text className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            className="mt-6 w-full items-center rounded-2xl py-4 active:opacity-90 disabled:opacity-50"
          >
            <LinearGradient
              colors={[brand[500], brand[700]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-full w-full items-center justify-center rounded-2xl"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">Sign In</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() =>
              loadDemo
                .mutateAsync()
                .then((seeded) =>
                  Alert.alert(
                    'Demo data',
                    seeded
                      ? 'Demo data is ready. Sign in to explore the app.'
                      : 'Demo data is already loaded.',
                  ),
                )
                .catch(() => Alert.alert('Demo data', 'Could not load demo data right now.'))
            }
            disabled={loadDemo.isPending}
            className="mt-3 w-full items-center rounded-2xl border border-neutral-300 px-6 py-3.5 active:opacity-80 disabled:opacity-50 dark:border-neutral-700"
          >
            <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              {loadDemo.isPending ? 'Loading demo data...' : 'Load demo data'}
            </Text>
          </Pressable>

          <View className="mt-auto pb-4">
            <View className="mb-3 items-center">
              <View className="flex-row items-center gap-1 rounded-full bg-brand-50 px-3 py-1 dark:bg-brand-950">
                <Text className="text-[11px] font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">
                  Offline First
                </Text>
              </View>
              <Text className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
                Your session stays on this device until you sign out.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}