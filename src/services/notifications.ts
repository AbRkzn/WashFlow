import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';

const CHANNEL_ID = 'job-updates';

const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

let handlerConfigured = false;

async function getNotifications(): Promise<typeof import('expo-notifications') | null> {
  if (isExpoGo) {
    return null;
  }
  try {
    const Notifications = await import('expo-notifications');
    if (!handlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }
    return Notifications;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        'expo-notifications unavailable in this runtime (expected in Expo Go on Android); local notifications disabled.',
        error,
      );
    }
    return null;
  }
}

export async function configureNotifications(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Job updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0891B2',
      });
    }
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      const request = await Notifications.requestPermissionsAsync();
      if (!request.granted) {
        console.warn('Notification permission not granted');
      }
    }
  } catch (error) {
    console.warn('Notification setup failed (non-fatal)', error);
  }
}

export async function notify(title: string, body: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (error) {
    console.warn('Local notification failed (non-fatal)', error);
  }
}

export async function notifyJobAssigned(plate: string, washerName: string): Promise<void> {
  await notify('New job assigned', `${plate} is assigned to ${washerName}.`);
}
