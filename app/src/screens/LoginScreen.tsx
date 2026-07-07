import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { semantic, fontFamily, fontSize, space } from '../theme';
import { Button, Icon, Input } from '../components/core';
import { PinMark } from '../components/brand/PinMark';
import { useActions } from '../store';

type Mode = 'login' | 'register';

/** Signed-out entry point: sign in, or register a new account. Gated in App.tsx
 * ahead of the Family Space gate and the main tabs. */
export function LoginScreen() {
  const actions = useActions();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await actions.register(username.trim().toLowerCase(), password, name.trim());
      } else {
        await actions.login(username.trim().toLowerCase(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = username.trim().length > 0 && password.length > 0 && (mode === 'login' || name.trim().length > 0) && !busy;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <PinMark size={48} />
            <Text style={{ fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.6, color: semantic.textStrong }}>FamilyChats</Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.bodyMd, color: semantic.textMuted, textAlign: 'center' }}>
              {mode === 'login' ? 'Sign in to your family space' : 'Create your account'}
            </Text>
          </View>

          <View style={{ gap: space[3] }}>
            {mode === 'register' && (
              <Input key="name" value={name} onChangeText={setName} placeholder="Your name" leading={<Icon name="user" size={18} color={semantic.textMuted} />} />
            )}
            <Input
              key="username"
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              leading={<Icon name="user" size={18} color={semantic.textMuted} />}
            />
            <Input
              key="password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              // iOS pushes its Password AutoFill / "Automatic Strong Password"
              // overlay onto secure fields, which blocks manual typing in Expo
              // Go. 'oneTimeCode' is the standard workaround to suppress it,
              // and the eye toggle (secureTextEntry off) bypasses secure-field
              // quirks entirely as a fallback.
              textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
              returnKeyType="go"
              leading={<Icon name="lock" size={18} color={semantic.textMuted} />}
              trailing={
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10} accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                  <Icon name={showPw ? 'eye-off' : 'eye'} size={18} color={semantic.textMuted} />
                </Pressable>
              }
              onSubmitEditing={submit}
            />
          </View>

          {error && (
            <Text style={{ color: semantic.danger, fontSize: fontSize.bodySm, marginTop: space[3], textAlign: 'center' }}>{error}</Text>
          )}

          <Button block variant="primary" size="lg" disabled={!canSubmit} onPress={submit} style={{ marginTop: space[5] }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>

          <Pressable
            onPress={() => {
              setError(null);
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            style={{ marginTop: space[5], alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: fontSize.bodySm, color: semantic.textLink }}>
              {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
