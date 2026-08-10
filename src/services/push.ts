import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/api/supabase';
import { db } from '@/data/db';
import { PushTokenRepository } from '@/data/repositories';

const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

const pushTokenRepository = new PushTokenRepository(db);

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

async function getNotifications(): Promise<typeof import('expo-notifications') | null> {
  if (isExpoGo) {
    return null;
  }
  try {
    return await import('expo-notifications');
  } catch (error) {
    if (__DEV__) {
      console.warn('expo-notifications unavailable; remote push disabled.', error);
    }
    return null;
  }
}

function resolveProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  if (fromEnv) return fromEnv;
  return Constants.expoConfig?.extra?.eas?.projectId;
}

/**
 * Registers this device's Expo push token for the signed-in user, mirrored to
 * the remote `push_tokens` table so the `send-push` Edge Function can reach it
 * from any device. Best-effort: failures are non-fatal.
 */
export async function registerDevicePush(userId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    const projectId = resolveProjectId();
    if (!projectId) {
      console.warn('Missing Expo project ID (set EXPO_PUBLIC_EXPO_PROJECT_ID or app.json extra.eas.projectId); remote push skipped.');
      return;
    }
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) {
        console.warn('Notification permission not granted; remote push skipped.');
        return;
      }
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) {
      console.warn('Expo push token request returned no token.');
      return;
    }
    const platform = Platform.OS;
    await pushTokenRepository.upsert(userId, token, platform);
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      );
    if (error) {
      console.warn('Remote push token registration failed (will retry on next sign-in).', error.message);
    }
  } catch (error) {
    console.warn('Push token registration failed (non-fatal).', error);
  }
}

/** Removes this device's token for a user from the local + remote registries. */
export async function unregisterDevicePush(userId: string): Promise<void> {
  try {
    const existing = await pushTokenRepository.findByUserId(userId);
    if (existing) {
      await supabase.from('push_tokens').delete().eq('token', existing.token);
    }
    await pushTokenRepository.deleteByUserId(userId);
  } catch (error) {
    console.warn('Push token removal failed (non-fatal).', error);
  }
}

interface RemotePushInput {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Sends a remote push to all devices registered for a user via the `send-push`
 * Edge Function (which talks to Expo's push service). Best-effort: network
 * errors never surface to the caller.
 */
export async function sendPushToUser(input: RemotePushInput): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: input,
    });
    if (error) {
      console.warn('send-push invocation failed (non-fatal).', error.message);
      return;
    }
    if (data?.error) {
      console.warn('send-push rejected:', data.error);
    }
  } catch (error) {
    console.warn('Remote push send failed (non-fatal).', error);
  }
}

/** Fires the Expo push HTTP endpoint directly (used by the Edge Function). */
export async function sendViaExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<{ sent: number; invalid: string[] }> {
  if (tokens.length === 0) {
    return { sent: 0, invalid: [] };
  }
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      tokens.map((to) => ({
        to,
        sound: 'default',
        ...payload,
      })),
    ),
  });
  if (!response.ok) {
    throw new Error(`Expo push service responded ${response.status}`);
  }
  const receipts = (await response.json()) as { data: { status: string; message?: string }[] };
  const invalid: string[] = [];
  receipts.data.forEach((receipt, index) => {
    if (receipt.status === 'error' && receipt.message?.includes('DeviceNotRegistered')) {
      invalid.push(tokens[index]);
    }
  });
  return { sent: receipts.data.length, invalid };
}
