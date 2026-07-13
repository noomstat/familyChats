import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { semantic, fontFamily, fontSize, space, radius } from '../theme';
import { Button, Card, Icon, Input } from '../components/core';
import { PinMark } from '../components/brand/PinMark';
import { useActions } from '../store';
import { buildExtendedInvite, parseInvite } from '../crypto/e2ee';
import type { FamilyStackParamList } from '../navigation/types';

/**
 * Shown when a signed-in user has no Family Space yet (App.tsx's Gate), AND
 * reachable (Phase S) as "add another family" from an already-in-a-family
 * user via the FamilyHub/YouScreen switcher's AddFamily route — see
 * AddFamilyScreen below, which wraps this in `mode="add"`. Family Space is
 * still invite-only — there's no browse/discover — but a user may now belong
 * to several.
 *
 * `onCreatedWithKey` fires right after a brand-new family is created (which is
 * E2EE by default — see AppStore's createFamily) with its extended invite, so
 * the caller can hold a "save your key" step open — once the invite string is
 * gone, the key can never be shown again. `onJoined` fires after a successful
 * join (no key step needed there — see AddFamilyScreen).
 */
export function FamilyGateScreen({
  mode = 'onboarding',
  onCreatedWithKey,
  onJoined,
}: {
  mode?: 'onboarding' | 'add';
  onCreatedWithKey?: (invite: string) => void;
  onJoined?: () => void;
}) {
  const actions = useActions();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const { family, keyB64 } = await actions.createFamily(name.trim());
      onCreatedWithKey?.(buildExtendedInvite(family.inviteCode, keyB64));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the family space');
    } finally {
      setCreating(false);
    }
  };

  const submitJoin = async () => {
    setError(null);
    setJoining(true);
    try {
      const parsed = parseInvite(code);
      await actions.joinFamily(parsed.code, parsed.keyB64);
      onJoined?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join with that code');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: space[4] }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 8, marginBottom: space[2] }}>
            <PinMark size={40} />
            <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: semantic.textStrong }}>
              {mode === 'add' ? 'Add another family' : 'Find your family'}
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.bodySm, color: semantic.textMuted, textAlign: 'center', paddingHorizontal: 12 }}>
              {mode === 'add'
                ? 'Start a new family space, or join one with an invite code — the new family becomes your active one.'
                : 'FamilyChats is invite-only. Start a new family space, or join one with an invite code from someone already in it.'}
            </Text>
          </View>

          {!!error && <Text style={{ color: semantic.danger, fontSize: fontSize.bodySm, textAlign: 'center' }}>{error}</Text>}

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="users" size={18} color={semantic.brand} />
              <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 17, color: semantic.textStrong }}>Create your family space</Text>
            </View>
            <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted, marginBottom: 14 }}>
              You'll get an invite code to share with the people you want in it.
            </Text>
            <Input value={name} onChangeText={setName} placeholder="Family name, e.g. The Nows" />
            <Button block variant="primary" disabled={!name.trim() || creating} onPress={submitCreate} style={{ marginTop: 12 }}>
              {creating ? 'Creating…' : 'Create family'}
            </Button>
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="share-2" size={18} color={semantic.brand} />
              <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 17, color: semantic.textStrong }}>Join with invite code</Text>
            </View>
            <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted, marginBottom: 14 }}>
              Every family is end-to-end encrypted, so paste the full invite (with the key after
              {' '}{'#'}) so you can read messages — a bare code still joins, but lands locked.
            </Text>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder="e.g. FAM123 or FAM123#K1.…"
              autoCapitalize="none"
              leading={<Icon name="lock" size={16} color={semantic.textMuted} />}
            />
            <Button block variant="secondary" disabled={parseInvite(code).code.length !== 6 || joining} onPress={submitJoin} style={{ marginTop: 12 }}>
              {joining ? 'Joining…' : 'Join family'}
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Shown once, right after creating a brand-new (E2EE-by-default) family — the
 * one and only moment the full extended invite (code + key) is ever
 * assembled and on screen together. The key itself lives on in YouScreen's
 * "encrypted" card for later sharing, but re-deriving the FULL invite string
 * there requires re-reading the raw key from keyStorage, which is why this
 * dedicated step exists rather than relying on users to have screenshotted
 * a toast.
 */
export function SaveFamilyKeyScreen({ invite, onDone }: { invite: string; onDone: () => void }) {
  const share = () => {
    Share.share({ message: `Join our family space on FamilyChats: ${invite}` }).catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: space[4] }}>
        <View style={{ alignItems: 'center', gap: 8, marginBottom: space[2] }}>
          <Icon name="shield" size={40} color={semantic.brand} />
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: semantic.textStrong, textAlign: 'center' }}>
            Save your family key
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.bodySm, color: semantic.textMuted, textAlign: 'center', paddingHorizontal: 12 }}>
            Your new family space is end-to-end encrypted — messages are unreadable to anyone without this key,
            including us. Share it with the people you invite; if it's lost, past messages can't be recovered.
          </Text>
        </View>

        <Card>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted, marginBottom: 8 }}>
            Extended invite (code + key)
          </Text>
          <View style={{ backgroundColor: semantic.surfaceSunk, borderRadius: radius.md, padding: 12 }}>
            <Text selectable style={{ fontFamily: fontFamily.mono, fontSize: 13, color: semantic.textStrong }}>
              {invite}
            </Text>
          </View>
          <Button block variant="secondary" leadingIcon={<Icon name="share-2" size={16} color={semantic.textStrong} />} onPress={share} style={{ marginTop: 12 }}>
            Share invite
          </Button>
        </Card>

        <Button block variant="primary" onPress={onDone}>
          I've saved it — Continue
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

type AddFamilyProps = NativeStackScreenProps<FamilyStackParamList, 'AddFamily'>;

/**
 * Phase S — navigable "add another family" entry point (FamilyHub's switcher,
 * YouScreen's families section), reusing FamilyGateScreen's create/join forms
 * for a user who already belongs to at least one family. createFamily/
 * joinFamily both make the new family active immediately (see AppStore.tsx),
 * so on success this just needs to get out of the way: a join pops straight
 * back, a create holds the one-time "save your key" step open first (same as
 * onboarding's SaveFamilyKeyScreen) before popping back.
 */
export function AddFamilyScreen({ navigation }: AddFamilyProps) {
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);

  if (pendingInvite) {
    return <SaveFamilyKeyScreen invite={pendingInvite} onDone={() => navigation.goBack()} />;
  }
  return <FamilyGateScreen mode="add" onCreatedWithKey={setPendingInvite} onJoined={() => navigation.goBack()} />;
}
