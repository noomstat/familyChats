import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Input } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { PresenceDot } from '../components/chat';
import { ChatBubble } from '../components/chat';
import { LocationTile, LivePill } from '../components/location';
import { INITIAL_MESSAGES, ThreadMessage } from '../data/familyChats';
import type { ChatsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ChatsStackParamList, 'Thread'>;

export function ThreadScreen({ route, navigation }: Props) {
  const { group } = route.params;
  const [msgs, setMsgs] = useState<ThreadMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState(false);
  const [sharing, setSharing] = useState(group.live);
  const listRef = useRef<FlatList>(null);

  const send = () => {
    if (!draft.trim()) return;
    setMsgs((m) => [...m, { id: Date.now(), mine: true, text: draft.trim() }]);
    setDraft('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const confirmShare = (dur: string) => {
    setSharing(true);
    setSheet(false);
    setMsgs((m) => [...m, { id: Date.now(), mine: true, live: true, loc: { label: 'Your live location', meta: 'Sharing · ' + dur } }]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top', 'bottom']}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: semantic.borderSubtle, backgroundColor: semantic.surfaceCard }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Avatar name={group.name} size={40} presence={sharing ? 'live' : null} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 17, color: semantic.textStrong }}>{group.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {sharing ? (
              <>
                <PresenceDot state="live" size={7} />
                <Text style={{ fontSize: 12, color: semantic.textMuted }}>3 sharing live · {group.members} members</Text>
              </>
            ) : (
              <Text style={{ fontSize: 12, color: semantic.textMuted }}>{group.members ? group.members + ' members' : 'online'}</Text>
            )}
          </View>
        </View>
        <IconButton name="receipt" variant="soft" accessibilityLabel="Expenses" onPress={() => navigation.navigate('Expenses', { group })} />
        <IconButton name="map" variant="soft" accessibilityLabel="View map" />
      </View>

      {sharing && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: semantic.liveSoft, borderBottomWidth: 1, borderBottomColor: colors.ping200 }}>
          <LivePill timeLeft="58 min left" compact />
          <Pressable onPress={() => setSharing(false)}>
            <Text style={{ color: colors.ping700, fontFamily: fontFamily.bodySemibold, fontSize: 13 }}>Stop</Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          style={{ backgroundColor: semantic.surfacePage }}
          renderItem={({ item }) => <ChatMsg m={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* composer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: semantic.surfaceCard, borderTopWidth: 1, borderTopColor: semantic.borderSubtle }}>
          <IconButton name={sharing ? 'navigation' : 'map-pin'} variant={sharing ? 'live' : 'soft'} accessibilityLabel="Share location" onPress={() => setSheet(true)} />
          <View style={{ flex: 1 }}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              onSubmitEditing={send}
              trailing={<Icon name="smile" size={19} color={semantic.textMuted} />}
            />
          </View>
          {draft.trim() ? (
            <IconButton name="send" variant="primary" accessibilityLabel="Send" onPress={send} />
          ) : (
            <IconButton name="mic" variant="soft" accessibilityLabel="Voice" />
          )}
        </View>
      </KeyboardAvoidingView>

      {sheet && <ShareSheet onClose={() => setSheet(false)} onConfirm={confirmShare} />}
    </SafeAreaView>
  );
}

function ChatMsg({ m }: { m: ThreadMessage }) {
  const attachment = m.loc ? (
    <LocationTile label={m.loc.label} meta={m.loc.meta} live={m.live} pinIcon={m.live ? 'navigation' : 'map-pin'} height={100} />
  ) : undefined;
  return (
    <ChatBubble mine={m.mine} author={m.author} attachment={attachment}>
      {m.text}
    </ChatBubble>
  );
}

function ShareSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: (dur: string) => void }) {
  const opts: [string, string][] = [
    ['15 minutes', '15 min'],
    ['1 hour', '1 hr'],
    ['Until I stop', 'until stopped'],
  ];
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.4)', justifyContent: 'flex-end' }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <View style={{ backgroundColor: semantic.surfaceCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, ...shadow.xl }}>
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: semantic.borderStrong, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong, marginBottom: 4 }}>Share live location</Text>
        <Text style={{ fontSize: 14, color: semantic.textMuted, marginBottom: 16 }}>
          Your group sees where you are until this ends. You can stop anytime.
        </Text>
        <View style={{ gap: 8 }}>
          {opts.map(([label, dur]) => (
            <Pressable
              key={dur}
              onPress={() => onConfirm(dur)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1, borderColor: semantic.borderDefault, backgroundColor: semantic.surfacePage }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: semantic.textStrong }}>{label}</Text>
              <Icon name="chevron-right" size={18} color={semantic.textFaint} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
