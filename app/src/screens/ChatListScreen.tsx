import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { semantic, fontFamily, fontSize, space } from '../theme';
import { Icon, IconButton, Input, Chip } from '../components/core';
import { ConversationRow } from '../components/chat';
import { PinMark } from '../components/brand/PinMark';
import { useChatRows, useGroups, ChatRow } from '../store';
import type { ChatsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ChatsStackParamList, 'ChatList'>;

const FILTERS = ['All', 'Live now', 'Groups', 'Unread'] as const;

export function ChatListScreen({ navigation }: Props) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const groups = useGroups();
  const allRows: ChatRow[] = useChatRows();
  let rows = allRows;
  if (filter === 'Live now') rows = rows.filter((g) => g.live);
  if (filter === 'Groups') rows = rows.filter((g) => g.members);
  if (filter === 'Unread') rows = rows.filter((g) => g.unread);
  if (q) rows = rows.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <PinMark size={30} />
            <Text style={{ fontFamily: fontFamily.display, fontSize: 26, letterSpacing: -0.6, color: semantic.textStrong }}>FamilyChats</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton name="bell" variant="soft" size="sm" accessibilityLabel="Notifications" />
            <IconButton name="plus" variant="primary" size="sm" accessibilityLabel="New chat" onPress={() => navigation.navigate('NewChat')} />
          </View>
        </View>
        <Input value={q} onChangeText={setQ} placeholder="Search groups & places" leading={<Icon name="search" size={18} color={semantic.textMuted} />} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {FILTERS.map((f) => (
            <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: space[6] }}
        renderItem={({ item }) => (
          <ConversationRow
            {...item}
            onPress={() => {
              const g = groups[item.id];
              if (g) navigation.navigate('Thread', { group: g });
            }}
          />
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 40, fontSize: fontSize.bodySm }}>
            {allRows.length === 0 ? 'Start your first family chat' : 'Nothing here yet'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
