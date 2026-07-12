import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { semantic, fontFamily, fontSize, radius, shadow, space } from '../theme';
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

        {family && <E2EECard family={family} actions={actions} />}

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

type Actions = ReturnType<typeof useActions>;
type Family = NonNullable<ReturnType<typeof useFamily>>;

/**
 * Phase K — e2ee status card. When on, shows the badge plus the extended
 * invite (re-derived from the locally-stored key, since the server never has
 * it) with a share affordance. When off, the owner gets a row to turn it on;
 * everyone else just sees the plain "not encrypted" state.
 */
function E2EECard({ family, actions }: { family: Family; actions: Actions }) {
  const [keyB64, setKeyB64] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!family.e2ee) {
      setKeyB64(null);
      return;
    }
    keyStorage.get(family.id).then((k) => {
      if (!cancelled) setKeyB64(k);
    });
    return () => {
      cancelled = true;
    };
  }, [family.e2ee, family.id]);

  const invite = keyB64 ? buildExtendedInvite(family.inviteCode, keyB64) : null;

  const share = () => {
    if (invite) Share.share({ message: `Join our family space on FamilyChats: ${invite}` }).catch(() => {});
  };

  const confirmEnable = async () => {
    setError(null);
    setEnabling(true);
    try {
      await actions.enableE2EE();
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable encryption');
    } finally {
      setEnabling(false);
    }
  };

  if (family.e2ee) {
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
      </Card>
    );
  }

  if (family.role !== 'owner') {
    return (
      <Card style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="shield" size={18} color={semantic.textFaint} />
        <Text style={{ flex: 1, fontSize: fontSize.bodySm, color: semantic.textMuted }}>
          This family isn't end-to-end encrypted yet. Only {family.name}'s owner can turn it on.
        </Text>
      </Card>
    );
  }

  return (
    <>
      <Card padding="none" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <Pressable
          onPress={() => setConfirmOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
        >
          <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={18} color={semantic.textBody} />
          </View>
          <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>Enable encryption</Text>
          <Icon name="chevron-right" size={18} color={semantic.textFaint} />
        </Pressable>
      </Card>
      {confirmOpen && (
        <EnableE2EESheet
          familyName={family.name}
          enabling={enabling}
          error={error}
          onConfirm={confirmEnable}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

function EnableE2EESheet({
  familyName,
  enabling,
  error,
  onConfirm,
  onClose,
}: {
  familyName: string;
  enabling: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}
    >
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <View style={{ backgroundColor: semantic.surfaceCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, gap: 14, ...shadow.xl }}>
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: semantic.borderStrong, alignSelf: 'center' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="shield" size={20} color={semantic.brand} />
          <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>Enable encryption</Text>
        </View>
        <Text style={{ fontSize: 14, lineHeight: 20, color: semantic.textBody }}>
          Text and location messages in {familyName} will be end-to-end encrypted — readable only on devices that
          hold the key, never on the server.
        </Text>
        <View style={{ gap: space[2] }}>
          <Text style={{ fontSize: 13, lineHeight: 19, color: semantic.textMuted }}>• This can't be undone — there's no way to turn it back off.</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: semantic.textMuted }}>• AI catch-up summaries and AI search won't be able to read encrypted messages.</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: semantic.textMuted }}>• Push notifications will just say "New message", not a preview.</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: semantic.textMuted }}>• If everyone loses the key, that history is gone for good.</Text>
        </View>
        {!!error && <Text style={{ fontSize: 13, color: semantic.danger }}>{error}</Text>}
        <Button block variant="primary" disabled={enabling} onPress={onConfirm}>
          {enabling ? 'Enabling…' : 'Enable encryption'}
        </Button>
        <Button block variant="ghost" disabled={enabling} onPress={onClose}>
          Cancel
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
