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
};

export type RootTabParamList = {
  Chats: NavigatorScreenParams<ChatsStackParamList>;
  Family: NavigatorScreenParams<FamilyStackParamList>;
  Map: undefined;
  You: undefined;
};
