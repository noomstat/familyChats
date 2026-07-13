// Phase V — a friend conversation thread (1:1 DM or friend group). Reuses
// the same chat sub-components as family chat's ThreadScreen (ChatBubble,
// VoiceBubble, LocationTile) but is keyed by conversationKeyFor()'s
// per-conversation key (see store/AppStore.tsx) instead of the family
// keyring, and by friend/member names instead of family membership.
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, radius, shadow } from '../theme';
import { Icon, IconButton, Input, Button, Chip } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { ChatBubble, VoiceBubble } from '../components/chat';
import { LocationTile, LivePill } from '../components/location';
import {
  ChatGroup,
  Message,
  friendConvoDisplayName,
  useActions,
  useConversationKeyReady,
  useFriends,
  useLive,
  useMessages,
  useReadCursors,
  useSession,
} from '../store';
import type { FriendsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendThread'>;

export function FriendThreadScreen({ route, navigation }: Props) {
  const group: ChatGroup = route.params.group;
  const session = useSession();
  const friends = useFriends();
  const msgs = useMessages(group.id);
  const cursors = useReadCursors(group.id);
  const actions = useActions();
  const keyReady = useConversationKeyReady(group.id);
  const live = useLive(group.id);
  const sharing = !!live;
  const [draft, setDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const isFocusedRef = React.useRef(false);

  const nameOf = useCallback((id: string) => group.memberNames?.[id] ?? friends.find((f) => f.id === id)?.name ?? id, [group.memberNames, friends]);
  const title = friendConvoDisplayName(group, session?.userId);
  const isGroup = group.members.length > 2;

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      actions.markRead(group.id);
      return () => {
        isFocusedRef.current = false;
      };
    }, [group.id, actions]),
  );
  React.useEffect(() => {
    if (isFocusedRef.current) actions.markRead(group.id);
  }, [msgs.length, group.id, actions]);

  const inverted = useMemo(() => [...msgs].reverse(), [msgs]);

  const send = () => {
    if (!draft.trim() || !keyReady) return;
    actions.sendMessage(group.id, draft.trim());
    setDraft('');
  };

  const confirmShare = (dur: string) => {
    if (!keyReady) return;
    setShareSheetOpen(false);
    actions.startLive(group.id, dur === 'until stopped' ? 'Sharing until stopped' : dur + ' left');
    actions.sendLocation(group.id, 'Your live location', 'Sharing · ' + dur, true);
  };

  const receiptFor = (m: Message): { read: number; total: number } => {
    const others = group.members.filter((id) => id !== m.authorId);
    const read = others.filter((id) => (cursors[id] ?? 0) >= m.ts).length;
    return { read, total: others.length };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: semantic.borderSubtle, backgroundColor: semantic.surfaceCard }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Avatar name={title} size={40} presence={sharing ? 'live' : null} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 17, color: semantic.textStrong }}>{title}</Text>
            <Icon name="lock" size={13} color={semantic.textMuted} />
          </View>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>{isGroup ? `${group.members.length} members` : 'End-to-end encrypted'}</Text>
        </View>
        {isGroup && <IconButton name="settings" variant="soft" accessibilityLabel="Group settings" onPress={() => setSettingsOpen(true)} />}
      </View>

      {sharing && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: semantic.liveSoft, borderBottomWidth: 1, borderBottomColor: colors.ping200 }}>
          <LivePill timeLeft={live?.expiresLabel ?? 'Sharing'} compact />
          <Pressable onPress={() => actions.stopLive(group.id)}>
            <Text style={{ color: colors.ping700, fontFamily: fontFamily.bodySemibold, fontSize: 13 }}>Stop</Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={inverted}
          inverted
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          style={{ backgroundColor: semantic.surfacePage }}
          renderItem={({ item }) => (
            <FriendChatMsg m={item} mine={item.authorId === session?.userId} authorName={item.authorName ?? nameOf(item.authorId)} receipt={item.authorId === session?.userId ? receiptFor(item) : undefined} />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 40, fontSize: 13 }}>
              {keyReady ? 'Say hello — this conversation is end-to-end encrypted.' : 'Setting up encryption…'}
            </Text>
          }
        />

        {!keyReady && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: semantic.surfaceSunk, borderTopWidth: 1, borderTopColor: semantic.borderSubtle }}>
            <Icon name="lock" size={14} color={semantic.textMuted} />
            <Text style={{ flex: 1, fontSize: 12, color: semantic.textMuted }}>Setting up encryption for this conversation…</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: semantic.surfaceCard, borderTopWidth: 1, borderTopColor: semantic.borderSubtle }}>
          <IconButton
            name={sharing ? 'navigation' : 'map-pin'}
            variant={sharing ? 'live' : 'soft'}
            accessibilityLabel="Share location"
            disabled={!keyReady}
            onPress={() => setShareSheetOpen(true)}
          />
          <View style={{ flex: 1 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="Message" onSubmitEditing={send} disabled={!keyReady} />
          </View>
          <IconButton name="send" variant="primary" accessibilityLabel="Send" disabled={!draft.trim() || !keyReady} onPress={send} />
        </View>
      </KeyboardAvoidingView>

      {shareSheetOpen && <FriendShareSheet onClose={() => setShareSheetOpen(false)} onConfirm={confirmShare} />}
      {settingsOpen && (
        <FriendGroupSettingsSheet group={group} onClose={() => setSettingsOpen(false)} onLeft={() => navigation.navigate('FriendsList')} />
      )}
    </SafeAreaView>
  );
}

function FriendShareSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: (dur: string) => void }) {
  const opts: [string, string][] = [
    ['15 minutes', '15 min'],
    ['1 hour', '1 hr'],
    ['Until I stop', 'until stopped'],
  ];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.4)', justifyContent: 'flex-end' }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <View style={{ backgroundColor: semantic.surfaceCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, ...shadow.xl }}>
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: semantic.borderStrong, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong, marginBottom: 4 }}>Share live location</Text>
        <Text style={{ fontSize: 14, color: semantic.textMuted, marginBottom: 16 }}>
          This conversation sees where you are until this ends. You can stop anytime.
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
    </KeyboardAvoidingView>
  );
}

function FriendChatMsg({ m, mine, authorName, receipt }: { m: Message; mine: boolean; authorName: string; receipt?: { read: number; total: number } }) {
  if (m.locked) {
    return (
      <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <ChatBubble mine={mine} author={mine ? undefined : authorName} style={{ opacity: 0.55 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="lock" size={13} color={mine ? semantic.bubbleMeText : semantic.bubbleThemText} />
            <Text style={{ fontFamily: fontFamily.body, fontSize: 14, fontStyle: 'italic', color: mine ? semantic.bubbleMeText : semantic.bubbleThemText }}>
              Encrypted message
            </Text>
          </View>
        </ChatBubble>
      </View>
    );
  }

  const attachment = m.loc ? (
    <LocationTile label={m.loc.label} meta={m.loc.meta} live={m.live} pinIcon={m.live ? 'navigation' : 'map-pin'} height={100} />
  ) : m.kind === 'voice' && m.mediaPath ? (
    <VoiceBubble mediaPath={m.mediaPath} durationMs={m.durationMs} mine={mine} />
  ) : undefined;
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <ChatBubble mine={mine} author={mine ? undefined : authorName} attachment={attachment}>
        {m.kind === 'text' ? m.text : undefined}
      </ChatBubble>
      {mine && receipt && (
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, marginTop: 2, marginRight: 8, color: receipt.total > 0 && receipt.read === receipt.total ? colors.coral500 : semantic.textFaint }}>
          {receipt.total === 0 ? '✓' : `${receipt.read === receipt.total ? '✓✓' : '✓'} ${receipt.read}/${receipt.total}`}
        </Text>
      )}
    </View>
  );
}

/** Phase W — friend group management: member list, rename, add a friend not already in the group, leave. */
function FriendGroupSettingsSheet({ group, onClose, onLeft }: { group: ChatGroup; onClose: () => void; onLeft: () => void }) {
  const actions = useActions();
  const friends = useFriends();
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const memberList = group.members.map((id) => ({ id, name: group.memberNames?.[id] ?? friends.find((f) => f.id === id)?.name ?? id }));
  const addableFriends = friends.filter((f) => !group.members.includes(f.id));

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;
    setSaving(true);
    setError(null);
    try {
      await actions.renameFriendGroup(group.id, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename this group');
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (friendId: string) => {
    setAddingId(friendId);
    setError(null);
    try {
      await actions.addFriendGroupMember(group.id, friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that friend');
    } finally {
      setAddingId(null);
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      await actions.leaveFriendGroup(group.id);
      onLeft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave this group');
      setLeaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{ backgroundColor: semantic.surfaceCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, gap: 16, ...shadow.xl }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: semantic.borderStrong, alignSelf: 'center' }} />
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>Group settings</Text>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Name</Text>
          <Input value={name} onChangeText={setName} onSubmitEditing={save} placeholder="Group name" />
          <Button size="sm" variant="secondary" disabled={saving || !name.trim() || name.trim() === group.name} onPress={save}>
            Save name
          </Button>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Members ({memberList.length})</Text>
          {memberList.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={m.name} size={34} />
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>{m.name}</Text>
            </View>
          ))}
        </View>

        {addableFriends.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Add a friend</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {addableFriends.map((f) => (
                <Chip key={f.id} onPress={() => (addingId ? undefined : addMember(f.id))}>
                  {addingId === f.id ? 'Adding…' : f.name}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {!!error && <Text style={{ fontSize: 13, color: semantic.danger }}>{error}</Text>}

        <Button block variant="danger" disabled={leaving} onPress={leave}>
          Leave group
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
