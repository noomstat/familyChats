// Phase U — persistence for the user's Friends identity keypair. Same
// SecureStore/AsyncStorage platform split as tokenStorage.ts/keyStorage.ts
// (SecureStore keys may only contain alphanumerics/'.'/'-'/'_' — no colons).
// Unlike keyStorage.ts (one ring PER FAMILY), this is a single keypair for
// the whole account — one user, one identity, regardless of how many
// families/friends they have. The private key never touches the server;
// only the public half (via publishKey — see AppStore.tsx's identity-ready
// effect) ever leaves the device.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { IdentityKeypair } from '../crypto/friends';

const PRIV_KEY = 'familychats.identity-key';
const PUB_KEY = 'familychats.identity-pub';

async function rawGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function rawSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export const identityKeyStorage = {
  /** The device's identity keypair, or null if none has been generated yet. */
  async get(): Promise<IdentityKeypair | null> {
    const privB64 = await rawGet(PRIV_KEY);
    const pubB64 = await rawGet(PUB_KEY);
    if (!privB64 || !pubB64) return null;
    return { privB64, pubB64 };
  },

  async set(keypair: IdentityKeypair): Promise<void> {
    await rawSet(PRIV_KEY, keypair.privB64);
    await rawSet(PUB_KEY, keypair.pubB64);
  },
};
