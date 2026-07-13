// Per-family E2EE keyring persistence. Same secure-store/AsyncStorage platform
// split as tokenStorage.ts — SecureStore keys may only contain
// alphanumerics/'.'/'-'/'_' (see the colon bug fixed in 4dafde0), so the key
// name is `familychats.e2ee-keyring.<familyId>` (uuids are already key-legal).
// The key material itself never touches the server — this is purely local
// persistence of values the client generated, imported, or replayed from a
// key roll (see AppStore.tsx's rotateKey()/applyKeyRoll()).
//
// Phase N — a family holds an ordered *ring* of keys (index 0 = the original
// anchor key from the invite; last = active, used to encrypt new messages),
// not a single key, so rotation stays backward-readable. Stored as JSON
// `{keys: string[]}` under the key name above.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

function ringStorageKey(familyId: string): string {
  return `familychats.e2ee-keyring.${familyId}`;
}

/** Pre-Phase-N storage key — a single key, no ring wrapper. Read-only here; only ever migrated forward into a ring, never written again. */
function legacyStorageKey(familyId: string): string {
  return `familychats.e2ee-key.${familyId}`;
}

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

async function rawRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

interface RingShape {
  keys: string[];
}

function parseRing(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RingShape;
    return Array.isArray(parsed?.keys) && parsed.keys.every((k) => typeof k === 'string') ? parsed.keys : null;
  } catch {
    return null; // malformed/legacy-plaintext blob — treated as "no ring" by getRing's legacy shim below
  }
}

export const keyStorage = {
  /**
   * The family's full keyring, oldest-first (index 0 = anchor, last =
   * active), or null if this device holds no key at all yet. Back-compat:
   * if no ring is stored but a legacy single-key value exists (pre-Phase-N
   * installs), migrates it into a one-element ring and persists that before
   * returning.
   */
  async getRing(familyId: string): Promise<string[] | null> {
    const ring = parseRing(await rawGet(ringStorageKey(familyId)));
    if (ring) return ring;

    const legacy = await rawGet(legacyStorageKey(familyId));
    if (!legacy) return null;
    const migrated = [legacy];
    await rawSet(ringStorageKey(familyId), JSON.stringify({ keys: migrated } as RingShape));
    return migrated;
  },

  async setRing(familyId: string, keys: string[]): Promise<void> {
    await rawSet(ringStorageKey(familyId), JSON.stringify({ keys } as RingShape));
  },

  async clear(familyId: string): Promise<void> {
    await rawRemove(ringStorageKey(familyId));
    await rawRemove(legacyStorageKey(familyId));
  },
};
