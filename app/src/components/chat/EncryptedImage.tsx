// Phase Z — a friend-chat photo attachment's ChatBubble `attachment` slot.
// `mediaPath` is one of two shapes: the SENDER's own optimistic bubble holds
// a local file:/blob:/data: uri (the just-picked photo, already plaintext —
// see AppStore.tsx's sendAttachment) and renders it straight away; every
// other case is the server's '/uploads/<uuid>.bin' CIPHERTEXT path, which
// this component lazily downloads (only once mounted — never eagerly at
// bootstrap/mapping time, unlike text messages) and decrypts client-side
// with the conversation key. Mirrors VoiceBubble's local-vs-server uri split.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { semantic, radius } from '../../theme';
import { Icon } from '../core/Icon';
import { fileUrl } from '../../api/client';
import { bytesToBase64, decryptBytes } from '../../crypto/e2ee';

export interface EncryptedImageProps {
  /** Local file:/blob:/data: uri (own optimistic send) or a server '/uploads/…' ciphertext path. */
  mediaPath: string;
  mime: string;
  /** base64 XChaCha20-Poly1305 nonce the blob was encrypted under (see E2eePayload.file.nonce) — meaningless for a local (not-yet-uploaded) uri. */
  nonce: string;
  /** This conversation's resolved key (see useConversationKey), or null if it isn't resolvable yet — renders the failed state, same as a locked message. */
  convoKey: string | null;
  w?: number;
  h?: number;
}

const MAX_W = 220;
const DEFAULT_ASPECT = 4 / 3;

function isLocalUri(uri: string): boolean {
  return /^(file|blob|data):/.test(uri);
}

export function EncryptedImage({ mediaPath, mime, nonce, convoKey, w, h }: EncryptedImageProps) {
  const local = isLocalUri(mediaPath);
  const [dataUri, setDataUri] = useState<string | null>(local ? mediaPath : null);
  const [loading, setLoading] = useState(!local);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (local) {
      setDataUri(mediaPath);
      setLoading(false);
      setFailed(false);
      return;
    }
    if (!convoKey) {
      setLoading(false);
      setFailed(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const res = await fetch(fileUrl(mediaPath));
        if (!res.ok) throw new Error(`download failed (${res.status})`);
        const ciphertext = new Uint8Array(await res.arrayBuffer());
        const plain = decryptBytes(convoKey, nonce, ciphertext);
        if (!plain) throw new Error('decrypt failed');
        if (!cancelled) setDataUri(`data:${mime};base64,${bytesToBase64(plain)}`);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [local, mediaPath, nonce, convoKey, mime]);

  const aspect = w && h ? w / h : DEFAULT_ASPECT;
  const height = MAX_W / aspect;

  if (dataUri && !failed) {
    return <Image source={{ uri: dataUri }} style={{ width: MAX_W, height, borderRadius: radius.md }} resizeMode="cover" />;
  }

  return (
    <View
      style={{
        width: MAX_W,
        height,
        borderRadius: radius.md,
        backgroundColor: semantic.surfaceSunk,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading ? <ActivityIndicator color={semantic.textMuted} /> : <Icon name={failed ? 'lock' : 'image'} size={22} color={semantic.textFaint} />}
    </View>
  );
}
