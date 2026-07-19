import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, semantic, fontFamily, radius, shadow } from '../theme';
import { Icon, IconButton } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { PresenceDot } from '../components/chat';
import { MapPin, LivePill } from '../components/location';
import { useFamily, useGroup, useLiveGroups, useLive, usePhotoOf, useSession } from '../store';
import { fileUrl } from '../api/client';

// Fixed pin positions on the stylised map; names are filled from the live group.
const SLOTS = [
  { left: '30%', top: '34%' },
  { left: '62%', top: '50%' },
  { left: '46%', top: '60%' },
] as const;

const DISTANCES = ['0.4 mi · 6 min', '1.1 mi · 14 min', '0.7 mi · 9 min'];

export function MapScreen() {
  const liveGroups = useLiveGroups();
  const activeId = liveGroups[0];
  const group = useGroup(activeId ?? '');
  const live = useLive(activeId ?? '');
  const session = useSession();
  const family = useFamily();
  const photoOf = usePhotoOf();
  const nameOf = (id: string) => family?.members.find((m) => m.id === id)?.name ?? id;

  if (!group) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: radius.full, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="map-pin" size={28} color={semantic.textFaint} />
          </View>
          <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 18, color: semantic.textStrong }}>No one's live right now</Text>
          <Text style={{ textAlign: 'center', fontSize: 14, color: semantic.textMuted, maxWidth: 260 }}>
            When you or someone in a group shares their live location, they'll show up here on the map.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const myId = session?.userId;
  const otherIds = group.members.filter((id) => id !== myId);
  const others = otherIds.map(nameOf);
  const onMap = [nameOf(myId ?? ''), ...others].slice(0, SLOTS.length);
  const onTheWay: { id: string; name: string; meta: string }[] = otherIds
    .slice(0, 2)
    .map((id, i) => ({ id, name: nameOf(id), meta: DISTANCES[i] ?? '' }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flex: 1, position: 'relative' }}>
        <MapSurface names={onMap} />

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
            <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 15, color: semantic.textStrong }}>{group.name}</Text>
            <Text style={{ marginLeft: 'auto', fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>{onMap.length} live</Text>
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
            <LivePill timeLeft={live?.expiresLabel ?? 'Sharing'} compact />
          </View>
          {onTheWay.map(({ id, name: n, meta }) => (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <Avatar src={fileUrl(photoOf(id))} name={n} size={38} presence="live" />
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

function MapSurface({ names }: { names: readonly string[] }) {
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
      {names.map((name, i) => (
        <View key={name} style={{ position: 'absolute', left: SLOTS[i].left, top: SLOTS[i].top, marginLeft: -21, marginTop: -55 }}>
          <MapPin label={name[0]} live size={42} />
        </View>
      ))}
    </View>
  );
}
