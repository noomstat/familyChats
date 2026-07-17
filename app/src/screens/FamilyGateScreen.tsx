import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { semantic, fontFamily, fontSize, space } from '../theme';
import { Button, Card, Icon, Input } from '../components/core';
import { PinMark } from '../components/brand/PinMark';
import { useActions } from '../store';
import { parseInvite } from '../crypto/e2ee';
import { ScannerCard } from './AddFriendScreen';
import type { FamilyStackParamList } from '../navigation/types';

/**
 * Shown when a signed-in user has no Family Space yet (App.tsx's Gate), AND
 * reachable (Phase S) as "add another family" from an already-in-a-family
 * user via the FamilyHub/YouScreen switcher's AddFamily route — see
 * AddFamilyScreen below, which wraps this in `mode="add"`. Family Space is
 * still invite-only — there's no browse/discover — but a user may now belong
 * to several.
 *
 * Phase Y — pure auto-grant: neither create nor join ever produces/consumes
 * a key. `onCreated`/`onJoined` both just signal "done, move on" — there's
 * no "save your key" step anymore (a brand-new family self-grants its own
 * anchor key server-side — see AppStore's createFamily — and every future
 * member gets keyed automatically once an existing member's device is
 * online, never by anyone pasting/sharing anything).
 */
export function FamilyGateScreen({
  mode = 'onboarding',
  onCreated,
  onJoined,
}: {
  mode?: 'onboarding' | 'add';
  onCreated?: () => void;
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
      await actions.createFamily(name.trim());
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the family space');
    } finally {
      setCreating(false);
    }
  };

  /** Shared by both the typed-code field and the camera scanner below — `raw` is either a plain (or legacy-extended, key ignored) invite pasted by hand or a scanned QR payload, both parsed the same way. Returns whether the join succeeded (the scanner uses this to decide whether to keep scanning). */
  const performJoin = async (raw: string): Promise<boolean> => {
    setError(null);
    setJoining(true);
    try {
      const parsed = parseInvite(raw);
      await actions.joinFamily(parsed.code);
      onJoined?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join with that code');
      return false;
    } finally {
      setJoining(false);
    }
  };

  const submitJoin = () => performJoin(code);

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

          {/* Phase X — camera scanning is native-only (see AddFriendScreen's ScannerCard, reused here); web falls back to the paste field below. */}
          {Platform.OS !== 'web' && (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon name="scan-line" size={18} color={semantic.brand} />
                <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 17, color: semantic.textStrong }}>Scan a family QR</Text>
              </View>
              <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted, marginBottom: 14 }}>
                Point your camera at another member's family QR to join instantly.
              </Text>
              <ScannerCard connecting={joining} onScanned={performJoin} />
            </Card>
          )}

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="share-2" size={18} color={semantic.brand} />
              <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 17, color: semantic.textStrong }}>Join with invite code</Text>
            </View>
            <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted, marginBottom: 14 }}>
              Every family is end-to-end encrypted automatically — nothing to paste or share. Once you join, a
              member's device grants you access as soon as it's online.
            </Text>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder="e.g. FAM123"
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

type AddFamilyProps = NativeStackScreenProps<FamilyStackParamList, 'AddFamily'>;

/**
 * Phase S — navigable "add another family" entry point (FamilyHub's switcher,
 * YouScreen's families section), reusing FamilyGateScreen's create/join forms
 * for a user who already belongs to at least one family. createFamily/
 * joinFamily both make the new family active immediately (see AppStore.tsx),
 * so on success this just pops back — Phase Y removed the one-time "save
 * your key" step (there's no key to save; see FamilyGateScreen's header).
 */
export function AddFamilyScreen({ navigation }: AddFamilyProps) {
  return <FamilyGateScreen mode="add" onCreated={() => navigation.goBack()} onJoined={() => navigation.goBack()} />;
}
