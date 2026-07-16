// React Native / Hermes does not define a global WebCrypto `crypto.getRandomValues`.
// @noble/curves (X25519 keygen for the Friends identity keys, see
// ../crypto/friends.ts) needs it and throws "crypto.getRandomValues must be
// defined" without it. Back it with expo-crypto's getRandomValues, which works
// in Expo Go with no native-module linking (the same module e2ee.ts already
// uses for family-key randomness).
//
// This must be imported BEFORE anything that pulls in @noble/curves — see
// index.ts, which imports it as the very first line.
import * as ExpoCrypto from 'expo-crypto';

const g = globalThis as unknown as { crypto?: { getRandomValues?: (array: ArrayBufferView | null) => ArrayBufferView | null } };

if (!g.crypto) g.crypto = {};
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = (array) => {
    if (array) ExpoCrypto.getRandomValues(array as Parameters<typeof ExpoCrypto.getRandomValues>[0]);
    return array;
  };
}
