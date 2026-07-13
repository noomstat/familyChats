import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ChatGroup } from '../store/AppStore';

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

export type RootTabParamList = {
  Chats: NavigatorScreenParams<ChatsStackParamList>;
  Family: NavigatorScreenParams<FamilyStackParamList>;
  Map: undefined;
  You: undefined;
};
