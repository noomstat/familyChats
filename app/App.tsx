import React, { useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useFamilyChatsFonts } from './src/theme';
import { semantic } from './src/theme';
import { AppStoreProvider, useFamily, useRealtime, useSession, useSessionReady } from './src/store';
import { LoginScreen, FamilyGateScreen, SaveFamilyKeyScreen } from './src/screens';
import { usePushRegistration } from './src/notifications/registerPushToken';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Session → Family Space → main tabs gate. Rendered once fonts (and the
 * initial secure-store token check) have settled. */
function Gate() {
  const session = useSession();
  const family = useFamily();
  usePushRegistration(session?.token);
  useRealtime();
  // Held open right after creating a brand-new (E2EE-by-default) family, so
  // the one-time extended invite has somewhere to be shown/shared before
  // `family` being set would otherwise swap straight to the main tabs.
  const [pendingInvite, setPendingInvite] = React.useState<string | null>(null);

  if (!session) return <LoginScreen />;
  if (!family) return <FamilyGateScreen onCreatedWithKey={setPendingInvite} />;
  if (pendingInvite) return <SaveFamilyKeyScreen invite={pendingInvite} onDone={() => setPendingInvite(null)} />;
  return <RootNavigator />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFamilyChatsFonts();

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <View style={{ flex: 1, backgroundColor: semantic.surfacePage }} onLayout={onLayout}>
          <StatusBar style="dark" />
          <NavigationContainer>
            <SessionGate />
          </NavigationContainer>
        </View>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}

/** Holds the splash screen up (renders nothing) until the secure-store token
 * check has resolved, so signed-in users never flash the login screen. */
function SessionGate() {
  const ready = useSessionReady();
  if (!ready) return null;
  return <Gate />;
}
