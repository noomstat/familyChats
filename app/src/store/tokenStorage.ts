// Session-token persistence. Uses expo-secure-store on native (Keychain/
// Keystore-backed); expo-secure-store has no web implementation, so on web we
// fall back to AsyncStorage (which is itself localStorage-backed there) so
// the web build keeps working.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// SecureStore keys may only contain alphanumerics, '.', '-', '_' — a ':' here
// threw "Invalid key provided to SecureStore" on native and broke login.
const TOKEN_KEY = 'familychats.session-token';
// Pre-fix key (web only ever stored under it; native always rejected it).
const LEGACY_WEB_KEY = 'familychats:session-token';

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) return token;
      // One-time migration so existing web sessions survive the key rename.
      const legacy = await AsyncStorage.getItem(LEGACY_WEB_KEY);
      if (legacy) {
        await AsyncStorage.setItem(TOKEN_KEY, legacy);
        await AsyncStorage.removeItem(LEGACY_WEB_KEY);
      }
      return legacy;
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
