import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { colors, semantic, fontFamily, fontSize, radius } from '../../theme';
import { Icon } from '../core/Icon';
import { fileUrl } from '../../api/client';

export interface VoiceBubbleProps {
  /** '/uploads/<name>' once uploaded, or a local file:/blob:/data: uri right after recording. */
  mediaPath: string;
  durationMs?: number;
  /** Coral bubble (white glyph) vs. paper bubble (coral glyph) — matches ChatBubble's `mine`. */
  mine?: boolean;
}

// Only one clip plays at a time across the whole app — starting a new one
// pauses whatever was already playing. Module-level by design (mirrors the
// "single now-playing" rule most voice-message UIs follow).
let currentSound: Audio.Sound | null = null;
let currentSetPlaying: ((playing: boolean) => void) | null = null;

function fmt(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Server paths ('/uploads/…') resolve via fileUrl(); local file:/blob:/data:/http(s): uris play as-is. */
function sourceUri(mediaPath: string): string {
  return /^(file|blob|data|https?):/.test(mediaPath) ? mediaPath : fileUrl(mediaPath);
}

/** FamilyChats VoiceBubble — play/pause + a simple progress bar + duration, rendered as a ChatBubble attachment. */
export function VoiceBubble({ mediaPath, durationMs = 0, mine = false }: VoiceBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Unload on unmount (message scrolled out / thread closed) and release the
  // "now playing" slot if this bubble owned it.
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      if (currentSound === soundRef.current) {
        currentSound = null;
        currentSetPlaying = null;
      }
    };
  }, []);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) setTotalMs(status.durationMillis);
    setProgressMs(status.positionMillis);
    setPlaying(status.isPlaying);
    if (status.didJustFinish) setProgressMs(0);
  };

  const toggle = async () => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          return;
        }
        if (currentSound && currentSound !== soundRef.current) {
          await currentSound.pauseAsync().catch(() => {});
          currentSetPlaying?.(false);
        }
        currentSound = soundRef.current;
        currentSetPlaying = setPlaying;
        if (status.isLoaded && status.durationMillis && status.positionMillis >= status.durationMillis) {
          await soundRef.current.setPositionAsync(0);
        }
        await soundRef.current.playAsync();
        return;
      }
      if (currentSound) {
        await currentSound.pauseAsync().catch(() => {});
        currentSetPlaying?.(false);
      }
      const { sound } = await Audio.Sound.createAsync({ uri: sourceUri(mediaPath) }, { shouldPlay: true }, onStatus);
      soundRef.current = sound;
      currentSound = sound;
      currentSetPlaying = setPlaying;
    } catch (err) {
      console.warn('[VoiceBubble] playback failed', err);
    }
  };

  const pct = totalMs > 0 ? Math.min(1, progressMs / totalMs) : 0;
  const fg = mine ? colors.white : colors.coral600;
  const track = mine ? 'rgba(255,255,255,0.35)' : semantic.borderDefault;
  const label = playing || progressMs > 0 ? fmt(progressMs) : fmt(totalMs);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 170, paddingVertical: 2 }}>
      <Pressable
        onPress={toggle}
        accessibilityLabel={playing ? 'Pause voice message' : 'Play voice message'}
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: mine ? 'rgba(255,255,255,0.22)' : semantic.brandSoft,
        }}
      >
        <Icon name={playing ? 'pause' : 'play'} size={15} color={fg} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ height: 4, borderRadius: radius.full, backgroundColor: track, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: radius.full, backgroundColor: fg }} />
        </View>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: fontSize.micro, color: mine ? 'rgba(255,255,255,0.85)' : semantic.textMuted }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
