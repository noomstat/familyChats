import React from 'react';
import { Image, StyleProp, Text, View, ViewStyle } from 'react-native';
import { colors, semantic, fontFamily } from '../../theme';

export type Presence = 'live' | 'online' | 'away' | 'offline' | null;

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  presence?: Presence;
  ring?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const PRESENCE_COLOR: Record<string, string> = {
  live: colors.ping500,
  online: colors.ping500,
  away: colors.amber500,
  offline: colors.ink300,
};

const PALETTE = [colors.coral400, colors.ping400, colors.sky400, colors.amber500, colors.coral600, colors.ping600];

function pickColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** FamilyChats Avatar — round user image or initials, with optional presence ring/dot. */
export function Avatar({ src, name = '', size = 40, presence = null, ring = false, color, style }: AvatarProps) {
  const initials = initialsOf(name);
  const bg = color || pickColor(name);
  const showRing = ring || presence === 'live';
  const dotSize = Math.max(8, Math.round(size * 0.28));

  return (
    <View style={[{ width: size, height: size }, style]}>
      {showRing && (
        <>
          <View
            style={{
              position: 'absolute',
              left: -4,
              top: -4,
              right: -4,
              bottom: -4,
              borderRadius: size / 2 + 4,
              backgroundColor: PRESENCE_COLOR.live,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: -2,
              top: -2,
              right: -2,
              bottom: -2,
              borderRadius: size / 2 + 2,
              backgroundColor: semantic.surfaceCard,
            }}
          />
        </>
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
        }}
      >
        {src ? (
          <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text style={{ color: colors.white, fontFamily: fontFamily.displayBold, fontSize: size * 0.4 }}>
            {initials || '?'}
          </Text>
        )}
      </View>
      {presence && presence !== 'live' && (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: PRESENCE_COLOR[presence] ?? PRESENCE_COLOR.offline,
            borderWidth: 2,
            borderColor: semantic.surfaceCard,
          }}
        />
      )}
    </View>
  );
}
