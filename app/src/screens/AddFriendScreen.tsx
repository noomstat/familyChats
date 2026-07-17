import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Input, Button } from '../components/core';
import { useActions, useSession } from '../store';
import { parseFriendCode } from '../crypto/friends';
import type { FriendsStackParamList } from '../navigation/types';

// Camera is native-only here (per the plan: web falls back to the QR display
// + typed-code field, no live scanner UI on web). expo-camera does ship a
// .web.js implementation, but this keeps the web bundle simple/predictable
// and matches AGENTS.md's "verify `expo export --platform web` still
// succeeds" bar without depending on browser getUserMedia support in CI.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CameraView, useCameraPermissions } = Platform.OS === 'web' ? { CameraView: null as any, useCameraPermissions: null as any } : require('expo-camera');

type Props = NativeStackScreenProps<FriendsStackParamList, 'AddFriend'>;

export function AddFriendScreen({ navigation }: Props) {
  const session = useSession();
  const actions = useActions();

  const [myCode, setMyCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    actions
      .getMyFriendCode()
      .then((code) => {
        if (!cancelled) setMyCode(code);
      })
      .catch((err) => {
        if (!cancelled) setCodeError(err instanceof Error ? err.message : 'Could not load your QR code');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(
    async (raw: string) => {
      const parsed = parseFriendCode(raw);
      if (!parsed) {
        Alert.alert('Invalid code', "That doesn't look like a FamilyChats friend code.");
        return false;
      }
      if (session && parsed.userId === session.userId) {
        Alert.alert("That's your own code", 'Ask your friend to scan or share THEIR code instead.');
        return false;
      }
      setConnecting(true);
      try {
        const friend = await actions.connectFriend({ friendId: parsed.userId, token: parsed.friendToken });
        Alert.alert('Connected!', `You and ${friend.name} are now friends.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
        return true;
      } catch (err) {
        Alert.alert('Could not connect', err instanceof Error ? err.message : 'Please try again.');
        return false;
      } finally {
        setConnecting(false);
      }
    },
    [actions, navigation, session],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Add a friend</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 20 }}>
        {/* ── My QR ── */}
        <Section title="My code" subtitle="Have a friend scan this to connect instantly.">
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            {myCode ? (
              <>
                <View style={{ padding: 16, backgroundColor: colors.white, borderRadius: radius.lg, ...shadow.sm }}>
                  <QRCode value={myCode} size={200} />
                </View>
                <Text selectable style={{ fontSize: 11, color: semantic.textFaint, textAlign: 'center', paddingHorizontal: 8 }}>
                  {myCode}
                </Text>
              </>
            ) : codeError ? (
              <Text style={{ color: semantic.danger, fontSize: fontSize.bodySm, textAlign: 'center' }}>{codeError}</Text>
            ) : (
              <ActivityIndicator color={semantic.brand} />
            )}
          </View>
        </Section>

        {/* ── Scan (native only) ── */}
        {Platform.OS !== 'web' && (
          <Section title="Scan a friend's code" subtitle="Point your camera at their QR code.">
            <ScannerCard connecting={connecting} onScanned={connect} />
          </Section>
        )}

        {/* ── Typed-code fallback ── */}
        <Section
          title="Or enter a code"
          subtitle={Platform.OS === 'web' ? "Paste the code your friend shared — camera scanning isn't available on web yet." : "Camera not working? Paste the code your friend shared."}
        >
          <View style={{ gap: 10 }}>
            <Input
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="fc:1:…"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              disabled={!manualInput.trim() || connecting}
              onPress={() => connect(manualInput.trim()).then((ok) => ok && setManualInput(''))}
              leadingIcon={<Icon name="user-plus" size={18} color={colors.white} />}
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: semantic.surfaceCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: semantic.borderSubtle,
        padding: 16,
        gap: 10,
        ...shadow.xs,
      }}
    >
      <View>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: semantic.textMuted, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

/**
 * Native-only QR scanner (expo-camera's CameraView). `scannedRef` guards
 * against firing onScanned repeatedly for the same still-in-frame code while
 * the connect request is in flight or its result alert is up — cleared once
 * the in-flight attempt resolves (success OR failure), so a mis-scan can be
 * retried without leaving the camera view.
 */
/** Exported for reuse by FamilyGateScreen.tsx's join-by-QR path (Phase X) — generic beyond friend codes: any scanned QR string is handed to `onScanned`. */
export function ScannerCard({ connecting, onScanned }: { connecting: boolean; onScanned: (raw: string) => Promise<boolean> }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    (result: { data: string }) => {
      if (scannedRef.current || connecting) return;
      scannedRef.current = true;
      onScanned(result.data).finally(() => {
        scannedRef.current = false;
      });
    },
    [connecting, onScanned],
  );

  if (!permission) {
    return (
      <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={semantic.brand} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <Icon name="scan-line" size={28} color={semantic.textFaint} />
        <Text style={{ textAlign: 'center', fontSize: fontSize.bodySm, color: semantic.textMuted }}>
          {permission.canAskAgain
            ? 'Allow camera access to scan a QR code.'
            : 'Camera access was denied — enable it for FamilyChats in your device Settings, or use the code field below.'}
        </Text>
        {permission.canAskAgain && (
          <Button size="sm" variant="secondary" onPress={requestPermission}>
            Allow camera
          </Button>
        )}
      </View>
    );
  }

  return (
    <View style={{ height: 260, borderRadius: radius.md, overflow: 'hidden' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      {connecting && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={colors.white} />
        </View>
      )}
    </View>
  );
}
