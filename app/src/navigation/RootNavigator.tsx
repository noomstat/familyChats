import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute, RouteProp } from '@react-navigation/native';
import { MessageCircle, Map as MapIcon, User, Home } from 'lucide-react-native';
import { semantic, fontFamily } from '../theme';
import {
  ChatListScreen,
  ThreadScreen,
  NewChatScreen,
  MapScreen,
  YouScreen,
  FamilyHubScreen,
  CalendarScreen,
  GroceryScreen,
  TasksScreen,
  AlbumsScreen,
  AlbumScreen,
  MemoriesScreen,
  FinanceScreen,
} from '../screens';
import type { ChatsStackParamList, FamilyStackParamList, RootTabParamList } from './types';

const ChatsStack = createNativeStackNavigator<ChatsStackParamList>();
const FamilyStack = createNativeStackNavigator<FamilyStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// Thread & NewChat have their own full-bleed headers/back buttons and no
// bottom nav in the design — only the top-level list screen shows tab bar.
function chatsTabBarStyle(route: RouteProp<RootTabParamList, 'Chats'>) {
  const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'ChatList';
  if (focusedRoute === 'Thread' || focusedRoute === 'NewChat') {
    return { display: 'none' as const };
  }
  return { backgroundColor: semantic.surfaceCard, borderTopColor: semantic.borderSubtle };
}

function ChatsNavigator() {
  return (
    <ChatsStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatsStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatsStack.Screen name="Thread" component={ThreadScreen} />
      <ChatsStack.Screen name="NewChat" component={NewChatScreen} />
    </ChatsStack.Navigator>
  );
}

// FamilyHub, Calendar, Grocery, Tasks, Albums, and Finance all keep the tab
// bar visible (unlike Thread/NewChat in the Chats stack) — no per-route
// tabBarStyle override needed.
function FamilyNavigator() {
  return (
    <FamilyStack.Navigator screenOptions={{ headerShown: false }}>
      <FamilyStack.Screen name="FamilyHub" component={FamilyHubScreen} />
      <FamilyStack.Screen name="Calendar" component={CalendarScreen} />
      <FamilyStack.Screen name="Grocery" component={GroceryScreen} />
      <FamilyStack.Screen name="Tasks" component={TasksScreen} />
      <FamilyStack.Screen name="Albums" component={AlbumsScreen} />
      <FamilyStack.Screen name="Album" component={AlbumScreen} />
      <FamilyStack.Screen name="Memories" component={MemoriesScreen} />
      <FamilyStack.Screen name="Finance" component={FinanceScreen} />
    </FamilyStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: semantic.brand,
        tabBarInactiveTintColor: semantic.textFaint,
        tabBarStyle: { backgroundColor: semantic.surfaceCard, borderTopColor: semantic.borderSubtle },
        tabBarLabelStyle: { fontFamily: fontFamily.bodySemibold, fontSize: 10 },
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatsNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          tabBarStyle: chatsTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name="Family"
        component={FamilyNavigator}
        options={{ tabBarLabel: 'Family', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: 'Map', tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} /> }}
      />
      <Tab.Screen
        name="You"
        component={YouScreen}
        options={{ tabBarLabel: 'You', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
