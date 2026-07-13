import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, radius } from '../theme';
import { Icon, Badge, Card } from '../components/core';
import { PinMark } from '../components/brand/PinMark';
import {
  thb,
  useActions,
  useAlbums,
  useEvents,
  useFamilies,
  useFamily,
  useFinance,
  useGrocery,
  useNotes,
  useTasks,
} from '../store';
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

// Calendar, Grocery, Tasks & Albums are live as of Phase E, Memories as of
// Phase H — every tile is live.
export function FamilyHubScreen({ navigation }: Props) {
  const family = useFamily();
  const families = useFamilies();
  const actions = useActions();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const grocery = useGrocery();
  const tasks = useTasks();
  const events = useEvents();
  const albums = useAlbums();
  const notes = useNotes();
  const finance = useFinance();
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
    {
      key: 'notes',
      icon: 'sticky-note',
      label: 'Notes',
      subtitle: `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`,
      tint: colors.sky100,
      tintFg: colors.sky600,
      onPress: () => navigation.navigate('Notes'),
    },
    {
      key: 'memories',
      icon: 'history',
      label: 'Memories',
      subtitle: 'Your family story',
      tint: colors.ink100,
      tintFg: colors.ink600,
      onPress: () => navigation.navigate('Memories'),
    },
    {
      key: 'finance',
      icon: 'wallet',
      label: 'Finance',
      subtitle: finance.budget ? `${thb(finance.remaining)} remaining` : 'Set up a budget',
      tint: colors.ping100,
      tintFg: colors.ping700,
      onPress: () => navigation.navigate('Finance'),
    },
  ];

  // Phase S — switching sets AppStore's active family + re-bootstraps; the
  // panel closes once the store confirms the switch (or immediately on a
  // no-op tap of the already-active family).
  const switchTo = async (id: string) => {
    if (id === family?.id) {
      setSwitcherOpen(false);
      return;
    }
    setSwitching(id);
    try {
      await actions.switchFamily(id);
    } catch (err) {
      console.warn('[FamilyHub] switchFamily failed', err);
    } finally {
      setSwitching(null);
      setSwitcherOpen(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 }}>
        <Pressable
          onPress={() => setSwitcherOpen((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}
        >
          <PinMark size={30} />
          <View style={{ minWidth: 0, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 24, letterSpacing: -0.6, color: semantic.textStrong }}>
                {family?.name ?? 'Family'}
              </Text>
              {families.length > 1 && (
                <Icon name={switcherOpen ? 'chevron-up' : 'chevron-down'} size={18} color={semantic.textMuted} />
              )}
            </View>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>
              {family ? `${family.members.length} members · ${family.inviteCode}` : ''}
            </Text>
          </View>
        </Pressable>

        {switcherOpen && (
          <Card padding="none" style={{ overflow: 'hidden', marginTop: 10 }}>
            {families.map((f, i) => {
              const active = f.id === family?.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => switchTo(f.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: semantic.borderSubtle,
                  }}
                >
                  <Icon name="home" size={16} color={active ? semantic.brand : semantic.textMuted} />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: active ? fontFamily.bodySemibold : fontFamily.body,
                      fontSize: 14,
                      color: active ? semantic.textStrong : semantic.textBody,
                    }}
                  >
                    {f.name}
                  </Text>
                  {switching === f.id ? (
                    <ActivityIndicator size="small" color={semantic.textMuted} />
                  ) : active ? (
                    <Icon name="check" size={16} color={semantic.brand} />
                  ) : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                setSwitcherOpen(false);
                navigation.navigate('AddFamily');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderTopWidth: 1,
                borderTopColor: semantic.borderSubtle,
              }}
            >
              <Icon name="plus" size={16} color={semantic.brand} />
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: semantic.brand }}>
                Create or join another family
              </Text>
            </Pressable>
          </Card>
        )}
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
