import React from 'react';
import { Image, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../../theme';
import { Icon } from '../core/Icon';
import { MapPin } from './MapPin';

export interface LocationTileProps {
  label?: string;
  meta?: string;
  pinSrc?: string;
  pinIcon?: string;
  live?: boolean;
  height?: number;
  mapSrc?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Rally LocationTile — a compact shared-place / shared-location card.
 * Renders a stylized (non-interactive) map surface with a pin and a label bar.
 */
export function LocationTile({
  label = 'Shared location',
  meta,
  pinSrc,
  pinIcon = 'map-pin',
  live = false,
  height = 132,
  mapSrc,
  onPress,
  style,
}: LocationTileProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[
        {
          width: '100%',
          borderRadius: radius.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: semantic.borderSubtle,
          backgroundColor: semantic.surfaceCard,
          ...shadow.xs,
        },
        style,
      ]}
    >
      <View style={{ height, backgroundColor: colors.mapBg, overflow: 'hidden' }}>
        {mapSrc ? <Image source={{ uri: mapSrc }} style={{ width: '100%', height: '100%' }} /> : <RallyMapArt />}
        <View style={{ position: 'absolute', left: '50%', top: '48%', marginLeft: -19, marginTop: -50 }}>
          <MapPin src={pinSrc} icon={pinSrc ? undefined : pinIcon} live={live} size={38} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: semantic.surfaceCard }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: live ? semantic.liveSoft : semantic.brandSoft,
          }}
        >
          <Icon name={live ? 'navigation' : 'map-pin'} size={16} color={live ? colors.ping600 : colors.coral600} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: fontSize.bodySm }}>
            {label}
          </Text>
          {meta && <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: semantic.textMuted }}>{meta}</Text>}
        </View>
        <Icon name="chevron-right" size={18} color={semantic.textFaint} />
      </View>
    </Wrapper>
  );
}

/** Stylized map backdrop built from flat color blocks (no external tiles). */
function RallyMapArt() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={{ position: 'absolute', right: 0, top: 0, width: '38%', height: '100%', backgroundColor: colors.mapWater, opacity: 0.9 }} />
      <View style={{ position: 'absolute', left: '6%', bottom: '8%', width: '34%', height: '44%', backgroundColor: colors.ping100, borderRadius: 12 }} />
      <View style={{ position: 'absolute', left: 0, top: '46%', width: '100%', height: 8, backgroundColor: colors.mapRoad }} />
      <View style={{ position: 'absolute', left: '52%', top: 0, width: 8, height: '100%', backgroundColor: colors.mapRoad }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: '20%',
          width: '70%',
          height: 5,
          backgroundColor: colors.mapRoad,
          transform: [{ rotate: '-8deg' }],
        }}
      />
    </View>
  );
}
