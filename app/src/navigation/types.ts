import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ChatGroup } from '../store/AppStore';
import type { Friend } from '../api/client';

export type ChatsStackParamList = {
  ChatList: undefined;
  // Thread operates on the real, server-backed chat group.
  Thread: { group: ChatGroup };
  NewChat: undefined;
};

// The Family hub tab: a Card grid linking to Calendar, Grocery, Tasks, Albums,
// Memories, and Finance (family-wide shared ledger, Phase I).
export type FamilyStackParamList = {
  FamilyHub: undefined;
  Calendar: undefined;
  Grocery: undefined;
  Tasks: undefined;
  Notes: undefined;
  Albums: undefined;
  // `name` is a render-immediately fallback; the screen prefers the live
  // album from the store (rename/photoCount updates) once available.
  Album: { albumId: string; name: string };
  Memories: undefined;
  Finance: undefined;
  // Phase S — "add another family" (create/join), reachable from the
  // FamilyHub switcher even when the user already belongs to one or more
  // families (unlike App.tsx's Gate, which only renders FamilyGateScreen
  // outside the tab navigator for a family-less user).
  AddFamily: undefined;
};

// Phase U/V — Friends: a friends list + add-by-QR + friend E2EE chat (1:1
// DMs + friend groups). FriendThread operates on the real, server-backed
// friends-kind ChatGroup, same shape as ChatsStackParamList's Thread.
export type FriendsStackParamList = {
  FriendsList: undefined;
  AddFriend: undefined;
  FriendThread: { group: ChatGroup };
  NewFriendGroup: undefined;
};

export type RootTabParamList = {
  Chats: NavigatorScreenParams<ChatsStackParamList>;
  Family: NavigatorScreenParams<FamilyStackParamList>;
  Friends: NavigatorScreenParams<FriendsStackParamList>;
  Map: undefined;
  You: undefined;
};

// Re-exported here purely so screens importing navigation prop types don't
// also need a separate import from api/client for this one type.
export type { Friend };
