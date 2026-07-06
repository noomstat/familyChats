import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { semantic, fontFamily, fontSize, space } from '../theme';
import { Button, Card, Icon, Input } from '../components/core';
import { PinMark } from '../components/brand/PinMark';
import { useActions } from '../store';

/** Shown once a user is signed in but hasn't joined/created a Family Space yet.
 * Family Space is invite-only (v1: one family per user) — there's no browse/discover. */
export function FamilyGateScreen() {
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
      await actions.joinFamily(code.trim().toUpperCase());
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
            <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: semantic.textStrong }}>Find your family</Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.bodySm, color: semantic.textMuted, textAlign: 'center', paddingHorizontal: 12 }}>
              FamilyChats is invite-only. Start a new family space, or join one with an invite code from someone already in it.
            </Text>
          </View>

          {error && <Text style={{ color: semantic.danger, fontSize: fontSize.bodySm, textAlign: 'center' }}>{error}</Text>}

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
              Ask a family member for their 6-character invite code.
            </Text>
            <Input
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="e.g. FAM123"
              leading={<Icon name="lock" size={16} color={semantic.textMuted} />}
            />
            <Button block variant="secondary" disabled={code.trim().length !== 6 || joining} onPress={submitJoin} style={{ marginTop: 12 }}>
              {joining ? 'Joining…' : 'Join family'}
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
