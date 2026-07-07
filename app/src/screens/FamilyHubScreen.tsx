import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, radius } from '../theme';
import { Icon, Badge, Card } from '../components/core';
import { PinMark } from '../components/brand/PinMark';
import { useAlbums, useEvents, useFamily, useGrocery, useTasks } from '../store';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'FamilyHub'>;

interface HubTile {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
  tint: string;
  tintFg: string;
  onPress?: () => void;
}

// Calendar, Grocery, Tasks & Albums are live as of Phase E; Memories/AI
// Search are still to come (Phases H/G) — they render dimmed with a "Soon" badge.
export function FamilyHubScreen({ navigation }: Props) {
  const family = useFamily();
  const grocery = useGrocery();
  const tasks = useTasks();
  const events = useEvents();
  const albums = useAlbums();
  const unchecked = grocery.filter((g) => !g.checkedBy).length;
  const open = tasks.filter((t) => !t.done).length;
  const now = new Date();
  const monthCount = events.filter((e) => {
    const d = new Date(e.startTs);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const tiles: HubTile[] = [
    {
      key: 'calendar',
      icon: 'calendar',
      label: 'Calendar',
      subtitle: `${monthCount} this month`,
      tint: colors.sky100,
      tintFg: colors.sky500,
      onPress: () => navigation.navigate('Calendar'),
    },
    {
      key: 'grocery',
      icon: 'shopping-cart',
      label: 'Grocery',
      subtitle: `${unchecked} to buy`,
      tint: colors.coral100,
      tintFg: colors.coral600,
      onPress: () => navigation.navigate('Grocery'),
    },
    {
      key: 'tasks',
      icon: 'list-todo',
      label: 'Tasks',
      subtitle: `${open} open`,
      tint: colors.ping100,
      tintFg: colors.ping600,
      onPress: () => navigation.navigate('Tasks'),
    },
    {
      key: 'albums',
      icon: 'image',
      label: 'Albums',
      subtitle: `${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`,
      tint: colors.amber100,
      tintFg: colors.amber500,
      onPress: () => navigation.navigate('Albums'),
    },
    { key: 'memories', icon: 'history', label: 'Memories', subtitle: 'Moments over time', tint: colors.ink100, tintFg: colors.ink600 },
    { key: 'ai-search', icon: 'sparkles', label: 'AI Search', subtitle: 'Ask anything', tint: colors.coral50, tintFg: colors.coral500 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <PinMark size={30} />
          <View style={{ minWidth: 0 }}>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 24, letterSpacing: -0.6, color: semantic.textStrong }}>
              {family?.name ?? 'Family'}
            </Text>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>
              {family ? `${family.members.length} members · ${family.inviteCode}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          {tiles.map((tile) => (
            <HubCard key={tile.key} tile={tile} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HubCard({ tile }: { tile: HubTile }) {
  const soon = !tile.onPress;
  return (
    <Pressable disabled={soon} onPress={tile.onPress} style={{ width: '48%' }}>
      <Card padding="md" style={{ opacity: soon ? 0.45 : 1, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.full,
              backgroundColor: tile.tint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={tile.icon} size={21} color={tile.tintFg} />
          </View>
          {soon && (
            <Badge tone="neutral" size="sm">
              Soon
            </Badge>
          )}
        </View>
        <View>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>{tile.label}</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted, marginTop: 2 }}>{tile.subtitle}</Text>
        </View>
      </Card>
    </Pressable>
  );
}
