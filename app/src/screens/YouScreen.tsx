import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import QRCode from 'react-native-qrcode-svg';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, Switch, Card, Badge, Button } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { useActions, useFamilies, useFamily, useFriends, useSession } from '../store';
import type { FamilyState } from '../store';
import { keyStorage } from '../store/keyStorage';
import { buildExtendedInvite } from '../crypto/e2ee';
import type { RootTabParamList } from '../navigation/types';

const ROWS: [string, string, 'toggle' | 'chev'][] = [
  ['navigation', 'Share live by default', 'toggle'],
  ['bell', 'Notifications', 'chev'],
  ['users', 'Manage groups', 'chev'],
  ['lock', 'Privacy & who can see me', 'chev'],
];

export function YouScreen() {
  const [live, setLive] = useState(true);
  const session = useSession();
  const family = useFamily();
  const families = useFamilies();
  const actions = useActions();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const displayName = session?.name ?? 'You';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }}>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
          <Avatar name={displayName} size={88} ring />
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: semantic.textStrong }}>{displayName}</Text>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>
            @{session?.username ?? 'you'}
            {family ? ` · ${family.name} · ${family.inviteCode}` : ''}
          </Text>
        </View>

        <FamiliesCard
          families={families}
          activeId={family?.id ?? null}
          onSwitch={(id) => actions.switchFamily(id).catch((err) => console.warn('[YouScreen] switchFamily failed', err))}
          onAdd={() => navigation.navigate('Family', { screen: 'AddFamily' })}
        />

        {family && <E2EECard family={family} />}

        <Card padding="none" style={{ overflow: 'hidden' }}>
          {ROWS.map(([ic, label, kind], i) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: semantic.borderSubtle,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ic} size={18} color={semantic.textBody} />
              </View>
              <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{label}</Text>
              {kind === 'toggle' ? (
                <Switch checked={live} onChange={setLive} tone="live" />
              ) : (
                <Icon name="chevron-right" size={18} color={semantic.textFaint} />
              )}
            </View>
          ))}
        </Card>

        <Card padding="none" style={{ overflow: 'hidden', marginTop: 16 }}>
          <Pressable
            onPress={() => actions.logout()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: semantic.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="log-out" size={18} color={semantic.danger} />
            </View>
            <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.danger, fontSize: 15 }}>Log out</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

type Family = NonNullable<ReturnType<typeof useFamily>>;

/**
 * Phase S — every family the session user belongs to, with a tap-to-switch
 * row per family (active one checked) and an "Add another family" row that
 * deep-links into the Family tab's AddFamily route (this screen lives outside
 * the FamilyStack, hence the cross-tab navigate rather than a plain push).
 * Hidden entirely for a family-less account (nothing to switch between yet —
 * App.tsx's Gate already covers that onboarding case).
 */
function FamiliesCard({
  families,
  activeId,
  onSwitch,
  onAdd,
}: {
  families: FamilyState[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onAdd: () => void;
}) {
  const [switching, setSwitching] = useState<string | null>(null);

  const switchTo = (id: string) => {
    if (id === activeId) return;
    setSwitching(id);
    onSwitch(id);
    // No completion signal is threaded back from the fire-and-forget
    // onSwitch — clear the spinner optimistically once the store's own
    // switchFamily promise has had a moment to land (mirrors the codebase's
    // other fire-and-warn action patterns, e.g. addExpense/addGrocery).
    setTimeout(() => setSwitching(null), 1500);
  };

  if (!families.length) return null;

  return (
    <Card padding="none" style={{ overflow: 'hidden', marginBottom: 16 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Families</Text>
      </View>
      {families.map((f, i) => {
        const active = f.id === activeId;
        return (
          <Pressable
            key={f.id}
            onPress={() => switchTo(f.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: semantic.borderSubtle,
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="home" size={17} color={active ? semantic.brand : semantic.textBody} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{f.name}</Text>
              <Text style={{ fontSize: 12, color: semantic.textMuted, marginTop: 1 }}>
                {f.members.length} {f.members.length === 1 ? 'member' : 'members'} · {f.role}
              </Text>
            </View>
            {switching === f.id ? (
              <ActivityIndicator size="small" color={semantic.textMuted} />
            ) : active ? (
              <Badge tone="brand" size="sm">
                Active
              </Badge>
            ) : null}
          </Pressable>
        );
      })}
      <Pressable
        onPress={onAdd}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderTopWidth: 1,
          borderTopColor: semantic.borderSubtle,
        }}
      >
        <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={17} color={semantic.brand} />
        </View>
        <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.brand, fontSize: 15 }}>
          Create or join another family
        </Text>
      </Pressable>
    </Card>
  );
}

/**
 * Phase M — e2ee status card. Encryption is always on for every family (no
 * opt-in, no disable), so this always shows the "encrypted" state: the badge
 * plus the extended invite (re-derived from the locally-stored anchor key,
 * since the server never has it) with a share affordance. Phase N adds an
 * owner-only rotate-key row below it.
 */
function E2EECard({ family }: { family: Family }) {
  const [keyB64, setKeyB64] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    let cancelled = false;
    keyStorage.getRing(family.id).then((keys) => {
      if (!cancelled) setKeyB64(keys?.[0] ?? null); // index 0 = the original invite/anchor key — the invite is always built from that, even post-rotation
    });
    return () => {
      cancelled = true;
    };
  }, [family.id]);

  const invite = keyB64 ? buildExtendedInvite(family.inviteCode, keyB64) : null;

  const share = () => {
    if (invite) Share.share({ message: `Join our family space on FamilyChats: ${invite}` }).catch(() => {});
  };

  return (
    <Card style={{ marginBottom: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="shield" size={18} color={semantic.brand} />
        <Text style={{ flex: 1, fontFamily: fontFamily.displayBold, fontSize: 16, color: semantic.textStrong }}>
          End-to-end encrypted
        </Text>
        <Badge tone="brand" size="sm">
          🔒 On
        </Badge>
      </View>
      <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted }}>
        Messages in this family are readable only on devices that hold the key below. Share it when you invite
        someone — regenerating the invite code does NOT rotate this key.
      </Text>
      {invite ? (
        <>
          <View style={{ backgroundColor: semantic.surfaceSunk, borderRadius: radius.md, padding: 12 }}>
            <Text selectable style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textStrong }}>
              {invite}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<Icon name="share-2" size={14} color={semantic.textStrong} />}
              onPress={share}
              style={{ flex: 1 }}
            >
              Share invite
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<Icon name="qr-code" size={14} color={semantic.textStrong} />}
              onPress={() => setShowQr((s) => !s)}
              style={{ flex: 1 }}
            >
              {showQr ? 'Hide QR' : 'Show QR'}
            </Button>
          </View>
          {/* Phase X — a scannable version of the same extended invite, for
              someone to join with FamilyGateScreen's camera scanner. */}
          {showQr && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ padding: 16, backgroundColor: colors.white, borderRadius: radius.lg, ...shadow.sm }}>
                <QRCode value={invite} size={200} />
              </View>
            </View>
          )}
        </>
      ) : (
        <Text style={{ fontSize: fontSize.bodySm, color: semantic.textFaint }}>
          This device doesn't have the key yet — open a chat to enter it.
        </Text>
      )}

      {/* Phase X — any member can add straight from their friends list (no
          accept step — they're already mutual friends), not just the owner. */}
      <Pressable
        onPress={() => setShowAddMember(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: semantic.borderSubtle,
          paddingTop: 10,
        }}
      >
        <Icon name="user-plus" size={16} color={semantic.textBody} />
        <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, fontSize: 14, color: semantic.textStrong }}>
          Add a friend to this family
        </Text>
        <Icon name="chevron-right" size={16} color={semantic.textFaint} />
      </Pressable>
      {showAddMember && <AddMemberSheet family={family} onClose={() => setShowAddMember(false)} />}

      {family.role === 'owner' && <RotateKeyRow />}
      <LeaveFamilyRow family={family} />
    </Card>
  );
}

/**
 * Phase X — bottom sheet listing this device's friends (useFriends()) not
 * already in `family`, tap to add instantly. Mirrors FriendThreadScreen's
 * FriendGroupSettingsSheet "Add a friend" list/pattern.
 */
function AddMemberSheet({ family, onClose }: { family: Family; onClose: () => void }) {
  const actions = useActions();
  const friends = useFriends();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(family.members.map((m) => m.id));
  const addable = friends.filter((f) => !memberIds.has(f.id) && !addedIds.includes(f.id));

  const add = async (friendId: string) => {
    setAddingId(friendId);
    setError(null);
    try {
      await actions.addFriendToFamily(friendId);
      setAddedIds((ids) => [...ids, friendId]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that friend');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}
    >
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <ScrollView
        style={{ maxHeight: '75%' }}
        contentContainerStyle={{
          backgroundColor: semantic.surfaceCard,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 28,
          gap: 14,
          ...shadow.xl,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: semantic.borderStrong, alignSelf: 'center' }} />
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>Add a friend to {family.name}</Text>
        <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted }}>
          They join instantly — no invite needed since you're already friends.
        </Text>

        {!!error && <Text style={{ fontSize: 13, color: semantic.danger }}>{error}</Text>}

        <View style={{ gap: 10 }}>
          {addable.map((f) => (
            <Pressable key={f.id} onPress={() => (addingId ? undefined : add(f.id))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={f.name} size={34} />
              <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>{f.name}</Text>
              {addingId === f.id ? (
                <ActivityIndicator size="small" color={semantic.textMuted} />
              ) : (
                <Icon name="plus-circle" size={20} color={semantic.brand} />
              )}
            </Pressable>
          ))}
          {addedIds.map((id) => {
            const f = friends.find((x) => x.id === id);
            if (!f) return null;
            return (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.6 }}>
                <Avatar name={f.name} size={34} />
                <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>{f.name}</Text>
                <Badge tone="brand" size="sm">
                  Added
                </Badge>
              </View>
            );
          })}
          {addable.length === 0 && addedIds.length === 0 && (
            <Text style={{ fontSize: 13, color: semantic.textFaint }}>
              All your friends are already in this family — connect with more friends first.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Phase X — self-leave, always allowed (unlike rotate-key above, no
 * owner-only gate). Tap-to-arm confirm, same pattern as RotateKeyRow below.
 */
function LeaveFamilyRow({ family }: { family: Family }) {
  const actions = useActions();
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'leaving' | 'error'>('idle');

  const leave = async () => {
    setPhase('leaving');
    try {
      await actions.leaveFamily(family.id);
      // No 'done' phase to show — a successful leave switches the active
      // family (or shows onboarding) out from under this card entirely.
    } catch {
      setPhase('error');
      setTimeout(() => setPhase('idle'), 3000);
    }
  };

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: semantic.borderSubtle, paddingTop: 10, gap: 8 }}>
      {phase === 'idle' && (
        <Pressable onPress={() => setPhase('confirm')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="log-out" size={16} color={semantic.danger} />
          <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, fontSize: 14, color: semantic.danger }}>Leave family</Text>
          <Icon name="chevron-right" size={16} color={semantic.textFaint} />
        </Pressable>
      )}
      {phase === 'confirm' && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted }}>
            {family.role === 'owner'
              ? "You'll lose access to this family's chats and data — ownership passes to its longest-standing member."
              : "You'll lose access to this family's chats and data. You can rejoin later with an invite."}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" variant="danger" onPress={leave}>
              Leave now
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setPhase('idle')}>
              Cancel
            </Button>
          </View>
        </View>
      )}
      {phase === 'leaving' && <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted }}>Leaving…</Text>}
      {phase === 'error' && <Text style={{ fontSize: fontSize.bodySm, color: semantic.danger }}>Could not leave — try again.</Text>}
    </View>
  );
}

/**
 * Phase N — owner-only manual rotation. Confirm-inline (same tap-to-arm
 * pattern as AlbumScreen's photo delete, rather than a native Alert — this
 * codebase has no Alert/modal usage) then a short inline status line doubling
 * as the "toast". Non-owners never see this row (gated by the caller above).
 */
function RotateKeyRow() {
  const actions = useActions();
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'rotating' | 'done' | 'error'>('idle');

  const rotate = async () => {
    setPhase('rotating');
    try {
      await actions.rotateKey();
      setPhase('done');
    } catch {
      setPhase('error');
    } finally {
      setTimeout(() => setPhase('idle'), 3000);
    }
  };

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: semantic.borderSubtle, paddingTop: 10, gap: 8 }}>
      {phase === 'idle' && (
        <Pressable onPress={() => setPhase('confirm')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="refresh-cw" size={16} color={semantic.textBody} />
          <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, fontSize: 14, color: semantic.textStrong }}>
            Rotate encryption key
          </Text>
          <Icon name="chevron-right" size={16} color={semantic.textFaint} />
        </Pressable>
      )}
      {phase === 'confirm' && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted }}>
            Generates a fresh key for new messages. Everyone currently in the family keeps reading every past
            message — this doesn't remove anyone's access.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" variant="secondary" onPress={rotate}>
              Rotate now
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setPhase('idle')}>
              Cancel
            </Button>
          </View>
        </View>
      )}
      {phase === 'rotating' && <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted }}>Rotating…</Text>}
      {phase === 'done' && (
        <Text style={{ fontSize: fontSize.bodySm, color: semantic.brand }}>New key generated — old messages stay readable.</Text>
      )}
      {phase === 'error' && <Text style={{ fontSize: fontSize.bodySm, color: semantic.danger }}>Rotation failed — try again.</Text>}
    </View>
  );
}
