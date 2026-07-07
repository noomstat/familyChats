import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius } from '../theme';
import { Icon, IconButton, Card } from '../components/core';
import { useSession } from '../store';
import { timeLabel } from '../store/model';
import { fileUrl, getTimeline, TimelineItem, TimelineMonth } from '../api/client';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Memories'>;

/** Full calendar date ("Jul 6, 2026") — unlike timeLabel (clock/weekday), this
 * stays legible for entries months or years old, which the timeline routinely has. */
function dateLabel(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Not part of bootstrap/sync — see server/src/timeline.js's header comment
// for why. Fetched fresh each time this screen gains focus (mount + tab
// re-visit), plus pull-to-refresh; a tiny local-state fetch is simplest here
// since nothing else in the app needs the timeline.
export function MemoriesScreen({ navigation }: Props) {
  const session = useSession();
  const token = session?.token;
  const [months, setMonths] = useState<TimelineMonth[] | null>(null); // null = never loaded yet
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const res = await getTimeline(token);
        setMonths(res.months);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load memories');
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      load(false).catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]),
  );

  const sections = (months ?? []).map((m) => ({ title: m.label, key: m.month, data: m.items }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Memories</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>Your family story</Text>
        </View>
      </View>

      {months === null ? (
        <ActivityIndicator color={semantic.brand} style={{ padding: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={semantic.brand} />}
          renderSectionHeader={({ section }) => <MonthHeader label={section.title} />}
          renderItem={({ item }) => <TimelineRow item={item} />}
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: 'center', gap: 10 }}>
              <Icon name="history" size={30} color={semantic.textFaint} />
              <Text style={{ textAlign: 'center', color: semantic.textFaint, paddingHorizontal: 30, fontSize: fontSize.bodySm }}>
                Memories will collect here as your family shares.
              </Text>
            </View>
          }
        />
      )}

      {error && <Text style={{ textAlign: 'center', color: semantic.danger, fontSize: 12, paddingBottom: 10 }}>{error}</Text>}
    </SafeAreaView>
  );
}

function MonthHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontFamily: fontFamily.mono,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: semantic.textFaint,
        marginTop: 18,
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  if (item.type === 'photo') return <PhotoRow item={item} />;
  if (item.type === 'event') return <EventRow item={item} />;
  return <MilestoneRow item={item} />;
}

function PhotoRow({ item }: { item: Extract<TimelineItem, { type: 'photo' }> }) {
  return (
    <Card padding="sm" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <Image
        source={{ uri: fileUrl(item.filePath) }}
        style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: semantic.surfaceSunk }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: semantic.textStrong }}>
          {item.caption || item.albumName}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 12, color: semantic.textMuted, marginTop: 2 }}>
          {[item.uploaderName, item.albumName, timeLabel(new Date(item.ts).getTime())].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Card>
  );
}

function EventRow({ item }: { item: Extract<TimelineItem, { type: 'event' }> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          backgroundColor: colors.sky100,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="calendar" size={18} color={colors.sky500} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: semantic.textStrong }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 12, color: semantic.textMuted, marginTop: 2 }}>{dateLabel(item.startTs)}</Text>
      </View>
    </View>
  );
}

function MilestoneRow({ item }: { item: Extract<TimelineItem, { type: 'milestone' }> }) {
  // "New chat: ..." group milestones get the flag glyph; everything else
  // (family began, founded, joined) gets sparkles.
  const icon = item.id.startsWith('group-') ? 'flag' : 'sparkles';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          backgroundColor: colors.ink100,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={colors.ink600} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: semantic.textStrong }}>
          {item.text}
        </Text>
        <Text style={{ fontSize: 12, color: semantic.textMuted, marginTop: 2 }}>{dateLabel(item.ts)}</Text>
      </View>
    </View>
  );
}
