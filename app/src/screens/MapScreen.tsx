import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, semantic, fontFamily, radius, shadow } from '../theme';
import { IconButton } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { PresenceDot } from '../components/chat';
import { MapPin, LivePill } from '../components/location';

const PEOPLE_ON_MAP = [
  { name: 'Mara', left: '30%', top: '34%', live: true },
  { name: 'Dev', left: '62%', top: '50%', live: true },
  { name: 'You', left: '46%', top: '60%', live: true },
] as const;

const ON_THE_WAY: [string, string][] = [
  ['Mara Ito', '0.4 mi · 6 min'],
  ['Dev Kaur', '1.1 mi · 14 min'],
];

export function MapScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flex: 1, position: 'relative' }}>
        <MapSurface />

        {/* floating header */}
        <View style={{ position: 'absolute', top: 12, left: 14, right: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: semantic.surfaceCard,
              borderRadius: radius.full,
              paddingVertical: 10,
              paddingHorizontal: 16,
              ...shadow.md,
            }}
          >
            <PresenceDot state="live" size={9} />
            <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 15, color: semantic.textStrong }}>Trail Crew</Text>
            <Text style={{ marginLeft: 'auto', fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>3 live</Text>
          </View>
        </View>

        {/* bottom sheet of who's live */}
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 12,
            backgroundColor: semantic.surfaceCard,
            borderRadius: radius.xl,
            padding: 16,
            ...shadow.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 16, color: semantic.textStrong }}>On the way</Text>
            <LivePill timeLeft="58 min" compact />
          </View>
          {ON_THE_WAY.map(([n, meta]) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <Avatar name={n} size={38} presence="live" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{n}</Text>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>{meta}</Text>
              </View>
              <IconButton name="navigation" variant="outline" size="sm" accessibilityLabel="Directions" />
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MapSurface() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.mapBg, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: 0, top: 0, width: '34%', height: '60%', backgroundColor: colors.mapWater }} />
      <View style={{ position: 'absolute', left: '8%', bottom: '10%', width: '40%', height: '34%', backgroundColor: colors.ping100, borderRadius: 18 }} />
      <View style={{ position: 'absolute', left: 0, top: '44%', width: '100%', height: 12, backgroundColor: colors.white }} />
      <View style={{ position: 'absolute', left: '56%', top: 0, width: 12, height: '100%', backgroundColor: colors.white }} />
      <View style={{ position: 'absolute', left: 0, top: '72%', width: '80%', height: 7, backgroundColor: colors.white, transform: [{ rotate: '-6deg' }] }} />

      <View style={{ position: 'absolute', left: '50%', top: '26%', marginLeft: -20, marginTop: -53 }}>
        <MapPin icon="flag" color={colors.ink800} size={40} />
      </View>
      {PEOPLE_ON_MAP.map((p) => (
        <View key={p.name} style={{ position: 'absolute', left: p.left, top: p.top, marginLeft: -21, marginTop: -55 }}>
          <MapPin label={p.name[0]} live={p.live} size={42} />
        </View>
      ))}
    </View>
  );
}
