import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Base URL of the FamilyChats API (server/). Override per-environment with an
// EXPO_PUBLIC_API_BASE_URL env var (Expo exposes EXPO_PUBLIC_* to the client).
// NOTE: a physical device can't reach "localhost" on your dev machine — use the
// machine's LAN IP there, e.g. EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3002
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3002';

/**
 * Request notification permission, obtain the Expo push token, and register it
 * with the backend. Returns the token, or null if unavailable (simulator,
 * denied permission, or no EAS projectId configured yet).
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  // Push tokens only exist on real devices, not simulators/web.
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Expo push tokens require the EAS projectId. Until the project is set up on
  // EAS, this stays undefined and getExpoPushTokenAsync will throw — caught by
  // the hook below so the app still runs.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await fetch(`${API_BASE_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, expoToken: token, platform: Platform.OS }),
  });

  return token;
}

/** Register this device's push token once, on mount. */
export function usePushRegistration(userId: string) {
  useEffect(() => {
    registerPushToken(userId).catch((err) => {
      // Non-fatal: no EAS project yet, running in a simulator, permission denied, or API down.
      console.warn('[push] registration skipped:', err instanceof Error ? err.message : err);
    });
  }, [userId]);
}
