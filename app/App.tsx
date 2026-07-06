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
import { AppStoreProvider, CURRENT_USER } from './src/store';
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

export default function App() {
  const [fontsLoaded, fontError] = useFamilyChatsFonts();
  usePushRegistration(CURRENT_USER);

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
            <RootNavigator />
          </NavigationContainer>
        </View>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
