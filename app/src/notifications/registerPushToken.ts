import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { API_BASE_URL } from '../api/client';

/**
 * Request notification permission, obtain the Expo push token, and register it
 * with the backend (authenticated as the given session token — the server
 * derives the user id from it, per requireAuth in server/src/auth.js).
 * Returns the token, or null if unavailable (simulator, denied permission, or
 * no EAS projectId configured yet).
 */
export async function registerPushToken(sessionToken: string): Promise<string | null> {
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

  const { data: expoToken } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await fetch(`${API_BASE_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ expoToken, platform: Platform.OS }),
  });

  return expoToken;
}

/** Register this device's push token once a session exists (skips while logged out). */
export function usePushRegistration(sessionToken: string | undefined) {
  useEffect(() => {
    if (!sessionToken) return;
    registerPushToken(sessionToken).catch((err) => {
      // Non-fatal: no EAS project yet, running in a simulator, permission denied, or API down.
      console.warn('[push] registration skipped:', err instanceof Error ? err.message : err);
    });
  }, [sessionToken]);
}
