import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors, semantic, fontFamily, fontSize, radius } from '../theme';
import { Icon, IconButton, Input, Card, Chip } from '../components/core';
import { timeLabel, useGroups, useSession } from '../store';
import { aiSearch } from '../api/client';
import type { AiHit } from '../api/client';
import type { FamilyStackParamList, RootTabParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'AISearch'>;

const EXAMPLES = ['What do we need to buy?', 'When is the dentist?', 'What did Mara say about the cabin?'];

const HIT_ICON: Record<AiHit['type'], string> = {
  message: 'message-circle',
  task: 'list-todo',
  event: 'calendar',
  grocery: 'shopping-cart',
  photo: 'image',
  album: 'image',
};

type Status = 'idle' | 'loading' | 'result' | 'error';

export function AISearchScreen({ navigation }: Props) {
  const session = useSession();
  const groups = useGroups();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [answer, setAnswer] = useState('');
  const [hits, setHits] = useState<AiHit[]>([]);
  const [error, setError] = useState('');

  const run = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || !session) return;
    setQuery(trimmed);
    setStatus('loading');
    try {
      const res = await aiSearch(session.token, trimmed);
      setAnswer(res.answer);
      setHits(res.hits);
      setStatus('result');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message.includes('not configured') ? "AI isn't set up yet." : message || 'Search failed.');
      setStatus('error');
    }
  };

  const openHit = (hit: AiHit) => {
    if (hit.type === 'message') {
      const group = hit.groupId ? groups[hit.groupId] : undefined;
      if (!group) return;
      const rootNav = navigation.getParent<BottomTabNavigationProp<RootTabParamList>>();
      rootNav?.navigate('Chats', { screen: 'Thread', params: { group } });
      return;
    }
    if (hit.type === 'task') return navigation.navigate('Tasks');
    if (hit.type === 'event') return navigation.navigate('Calendar');
    if (hit.type === 'grocery') return navigation.navigate('Grocery');
    if (hit.type === 'photo' || hit.type === 'album') return navigation.navigate('Albums');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>AI Search</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Ask anything about your family…"
            leading={<Icon name="search" size={18} color={semantic.textFaint} />}
            onSubmitEditing={() => run(query)}
          />
        </View>
        <IconButton
          name="send"
          variant="primary"
          accessibilityLabel="Search"
          disabled={!query.trim() || status === 'loading'}
          onPress={() => run(query)}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 16 }}>
        {status === 'idle' && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 13, color: semantic.textMuted }}>Try asking things like:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EXAMPLES.map((example) => (
                <Chip key={example} onPress={() => run(example)}>
                  {example}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {status === 'loading' && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.coral500} />
          </View>
        )}

        {status === 'error' && (
          <View style={{ gap: 4, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: semantic.textStrong }}>{error}</Text>
            {error === "AI isn't set up yet." && (
              <Text style={{ fontSize: 12, color: semantic.textFaint }}>Ask whoever runs the server to set ANTHROPIC_API_KEY.</Text>
            )}
          </View>
        )}

        {status === 'result' && (
          <View style={{ gap: 14 }}>
            <Card padding="md">
              <Text style={{ fontFamily: fontFamily.display, fontSize: 16, lineHeight: 22, color: semantic.textStrong }}>{answer}</Text>
            </Card>

            {hits.length > 0 && (
              <View style={{ gap: 4 }}>
                {hits.map((hit) => (
                  <HitRow key={`${hit.type}-${hit.id}`} hit={hit} onPress={() => openHit(hit)} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HitRow({ hit, onPress }: { hit: AiHit; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radius.full,
          backgroundColor: semantic.surfaceSunk,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={HIT_ICON[hit.type]} size={16} color={semantic.textMuted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold, fontSize: fontSize.bodySm, color: semantic.textStrong }}>
          {hit.label}
        </Text>
        {!!hit.snippet && (
          <Text numberOfLines={1} style={{ fontSize: 12, color: semantic.textMuted }}>
            {hit.snippet}
          </Text>
        )}
      </View>
      <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: semantic.textFaint }}>{timeLabel(new Date(hit.ts).getTime())}</Text>
    </Pressable>
  );
}
