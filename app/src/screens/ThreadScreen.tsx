import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, radius, shadow } from '../theme';
import { Icon, IconButton, Input, Button, Chip } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { PresenceDot, ChatBubble, VoiceBubble } from '../components/chat';
import { LocationTile, LivePill } from '../components/location';
import { cancelRecording, fileInfoFromUri, requestPermissions, startRecording, stopRecording } from '../audio/voiceRecorder';
import {
  ChatGroup,
  Group,
  Message,
  useActions,
  useFamily,
  useHasMore,
  useLive,
  useMessages,
  useReadCursors,
  useSession,
} from '../store';
import type { FamilyMember } from '../api/client';
import type { ChatsStackParamList } from '../navigation/types';

/** mm:ss for the in-progress recording bar's elapsed timer. */
function fmtElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Props = NativeStackScreenProps<ChatsStackParamList, 'Thread'>;

export function ThreadScreen({ route, navigation }: Props) {
  const routeGroup = route.params.group;
  const family = useFamily();
  const session = useSession();
  const msgs = useMessages(routeGroup.id);
  const cursors = useReadCursors(routeGroup.id);
  const hasMore = useHasMore(routeGroup.id);
  const live = useLive(routeGroup.id);
  const sharing = !!live;
  const actions = useActions();
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const isFocusedRef = useRef(false);
  // Guards start/stop against double-fire (e.g. a stray extra onPressOut) —
  // React state updates are async, so a plain boolean ref is checked first.
  const recordingRef = useRef(false);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);
  useEffect(() => () => stopElapsedTimer(), [stopElapsedTimer]);

  const members = family?.members ?? [];
  const nameOf = useCallback((id: string) => members.find((m) => m.id === id)?.name ?? id, [members]);

  // The group route param is a snapshot at navigation time; membership/name
  // can change live (rename, add/remove member) — but a fixed id is stable.
  const group: ChatGroup = routeGroup;

  // Expenses is the local-only, pre-existing ledger feature — it's keyed by
  // a display-name roster (see model.ts's `Group`), not user ids. Adapt the
  // real chat group's shape minimally so that screen keeps compiling/working.
  const expensesGroup: Group = useMemo(
    () => ({
      id: group.id,
      name: group.name,
      members: group.members.length,
      roster: group.members.map(nameOf),
    }),
    [group.id, group.name, group.members, nameOf],
  );

  // Opening/refocusing a thread — or new messages arriving while it's
  // focused — marks it read.
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
    if (!draft.trim()) return;
    actions.sendMessage(group.id, draft.trim());
    setDraft('');
  };

  const confirmShare = (dur: string) => {
    setSheet(false);
    actions.startLive(group.id, dur === 'until stopped' ? 'Sharing until stopped' : dur + ' left');
    actions.sendLocation(group.id, 'Your live location', 'Sharing · ' + dur, true);
  };

  // Press-and-hold mic: onPressIn starts, onPressOut stops+sends. The mic
  // IconButton itself stays mounted throughout (only its `variant`/label
  // change) so the same Pressable keeps tracking the touch across the
  // composer-row swap below.
  const beginRecording = async () => {
    if (recordingRef.current) return;
    setMicWarning(null);
    const granted = await requestPermissions();
    if (!granted) {
      setMicWarning('Microphone access is needed to record a voice message.');
      return;
    }
    const started = await startRecording();
    if (!started) {
      setMicWarning('Could not start recording.');
      return;
    }
    recordingRef.current = true;
    setRecording(true);
    setElapsedMs(0);
    const startedAt = Date.now();
    stopElapsedTimer();
    elapsedTimerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
  };

  const finishRecording = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    stopElapsedTimer();
    const result = await stopRecording();
    if (!result || result.durationMs < 500) return; // too short to be a deliberate message
    const { name, mimeType } = fileInfoFromUri(result.uri);
    actions.sendVoice(group.id, { uri: result.uri, durationMs: result.durationMs, mimeType, name });
  };

  const cancelRecordingPress = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    stopElapsedTimer();
    await cancelRecording();
  };

  const loadEarlier = async () => {
    if (loadingEarlier || !hasMore) return;
    setLoadingEarlier(true);
    try {
      await actions.loadEarlier(group.id);
    } catch (err) {
      console.warn('[thread] loadEarlier failed', err);
    } finally {
      setLoadingEarlier(false);
    }
  };

  const readByAll = (m: Message): boolean => {
    const others = group.members.filter((id) => id !== m.authorId);
    if (!others.length) return false;
    return others.every((id) => (cursors[id] ?? 0) >= m.ts);
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
                <Text style={{ fontSize: 12, color: semantic.textMuted }}>sharing live · {group.members.length} members</Text>
              </>
            ) : (
              <Text style={{ fontSize: 12, color: semantic.textMuted }}>{group.members.length} members</Text>
            )}
          </View>
        </View>
        <IconButton name="receipt" variant="soft" accessibilityLabel="Expenses" onPress={() => navigation.navigate('Expenses', { group: expensesGroup })} />
        <IconButton name="settings" variant="soft" accessibilityLabel="Group settings" onPress={() => setSettingsOpen(true)} />
        <IconButton name="map" variant="soft" accessibilityLabel="View map" />
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
            <ChatMsg m={item} mine={item.authorId === session?.userId} authorName={item.authorName ?? nameOf(item.authorId)} read={item.authorId === session?.userId ? readByAll(item) : undefined} />
          )}
          onEndReached={loadEarlier}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingEarlier ? <ActivityIndicator style={{ marginVertical: 12 }} color={colors.coral500} /> : null}
        />

        {/* composer */}
        {micWarning && (
          <Text style={{ fontSize: 12, color: colors.rose500, paddingHorizontal: 16, paddingTop: 6, backgroundColor: semantic.surfaceCard }}>
            {micWarning}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: semantic.surfaceCard, borderTopWidth: 1, borderTopColor: semantic.borderSubtle }}>
          {recording ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PresenceDot state="live" size={9} />
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 15, color: semantic.textStrong }}>{fmtElapsed(elapsedMs)}</Text>
              <Text style={{ fontSize: 13, color: semantic.textMuted }}>Recording…</Text>
              <View style={{ flex: 1 }} />
              <Button size="sm" variant="ghost" onPress={cancelRecordingPress}>
                Cancel
              </Button>
            </View>
          ) : (
            <>
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
            </>
          )}
          {draft.trim() && !recording ? (
            <IconButton name="send" variant="primary" accessibilityLabel="Send" onPress={send} />
          ) : (
            <IconButton
              name="mic"
              variant={recording ? 'live' : 'soft'}
              accessibilityLabel={recording ? 'Release to send voice message' : 'Hold to record a voice message'}
              onPressIn={beginRecording}
              onPressOut={finishRecording}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {sheet && <ShareSheet onClose={() => setSheet(false)} onConfirm={confirmShare} />}
      {settingsOpen && (
        <GroupSettingsSheet
          group={group}
          familyMembers={members}
          onClose={() => setSettingsOpen(false)}
          onLeft={() => navigation.navigate('ChatList')}
        />
      )}
    </SafeAreaView>
  );
}

function ChatMsg({ m, mine, authorName, read }: { m: Message; mine: boolean; authorName: string; read?: boolean }) {
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
      {mine && (
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, marginTop: 2, marginRight: 8, color: read ? colors.coral500 : semantic.textFaint }}>
          {read ? '✓✓' : '✓'}
        </Text>
      )}
    </View>
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

function GroupSettingsSheet({
  group,
  familyMembers,
  onClose,
  onLeft,
}: {
  group: ChatGroup;
  familyMembers: FamilyMember[];
  onClose: () => void;
  onLeft: () => void;
}) {
  const actions = useActions();
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const memberList = group.members.map((id) => familyMembers.find((m) => m.id === id) ?? { id, name: id, username: id, role: 'member' as const });
  const nonMembers = familyMembers.filter((m) => !group.members.includes(m.id));

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;
    setSaving(true);
    try {
      await actions.renameGroup(group.id, trimmed);
    } catch (err) {
      console.warn('[thread] rename failed', err);
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (userId: string) => {
    try {
      await actions.addMember(group.id, userId);
    } catch (err) {
      console.warn('[thread] add member failed', err);
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      await actions.leaveGroup(group.id);
      onLeft();
    } catch (err) {
      console.warn('[thread] leave failed', err);
      setLeaving(false);
    }
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}>
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

        {nonMembers.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Add member</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {nonMembers.map((m) => (
                <Chip key={m.id} onPress={() => addMember(m.id)}>
                  {m.name}
                </Chip>
              ))}
            </View>
          </View>
        )}

        <Button block variant="danger" disabled={leaving} onPress={leave}>
          Leave group
        </Button>
      </ScrollView>
    </View>
  );
}
