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
import { AppStoreProvider, useFamily, useSession, useSessionReady } from './src/store';
import { LoginScreen, FamilyGateScreen } from './src/screens';
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

  if (!session) return <LoginScreen />;
  if (!family) return <FamilyGateScreen />;
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
