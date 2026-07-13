import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { semantic, fontFamily, fontSize, radius } from '../theme';
import { Icon, Switch, Card, Badge, Button } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { useActions, useFamily, useSession } from '../store';
import { keyStorage } from '../store/keyStorage';
import { buildExtendedInvite } from '../crypto/e2ee';

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
  const actions = useActions();

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
 * Phase M — e2ee status card. Encryption is always on for every family (no
 * opt-in, no disable), so this always shows the "encrypted" state: the badge
 * plus the extended invite (re-derived from the locally-stored anchor key,
 * since the server never has it) with a share affordance. Phase N adds an
 * owner-only rotate-key row below it.
 */
function E2EECard({ family }: { family: Family }) {
  const [keyB64, setKeyB64] = useState<string | null>(null);

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
          <Button size="sm" variant="secondary" leadingIcon={<Icon name="share-2" size={14} color={semantic.textStrong} />} onPress={share}>
            Share invite
          </Button>
        </>
      ) : (
        <Text style={{ fontSize: fontSize.bodySm, color: semantic.textFaint }}>
          This device doesn't have the key yet — open a chat to enter it.
        </Text>
      )}
      {family.role === 'owner' && <RotateKeyRow />}
    </Card>
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
