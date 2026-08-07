import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionStore } from '@/stores/session-store';
const roleHome = {
  admin: '/admin',
  manager: '/manager',
  cashier: '/cashier',
  washer: '/washer',
} as const;

export default function SignInScreen() {
  const user = useSessionStore((s) => s.user);
  const signIn = useSessionStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Redirect href={roleHome[user.role]} />;
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
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <View className="mb-6 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-brand-600">
              <Text className="text-3xl font-bold text-white">W</Text>
            </View>
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">WashFlow</Text>
            <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
              Sign in to continue. Internet is required to sign in.
            </Text>
          </View>

          <View className="gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              textContentType="password"
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            />
          </View>

          {error ? (
            <Text className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            className="mt-6 w-full items-center rounded-2xl bg-brand-600 px-6 py-4 active:opacity-80 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-white">Sign in</Text>
            )}
          </Pressable>

          <Text className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
            Your session stays on this device until you sign out.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
