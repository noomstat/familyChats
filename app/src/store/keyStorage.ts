// Per-family E2EE key persistence. Same secure-store/AsyncStorage platform
// split as tokenStorage.ts — SecureStore keys may only contain
// alphanumerics/'.'/'-'/'_' (see the colon bug fixed in 4dafde0), so the key
// name is `familychats.e2ee-key.<familyId>` (uuids are already key-legal).
// The key material itself never touches the server — this is purely local
// persistence of a value the client generated or imported.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

function storageKey(familyId: string): string {
  return `familychats.e2ee-key.${familyId}`;
}

export const keyStorage = {
  async get(familyId: string): Promise<string | null> {
    const key = storageKey(familyId);
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(familyId: string, keyB64: string): Promise<void> {
    const key = storageKey(familyId);
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, keyB64);
      return;
    }
    await SecureStore.setItemAsync(key, keyB64);
  },
  async clear(familyId: string): Promise<void> {
    const key = storageKey(familyId);
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
