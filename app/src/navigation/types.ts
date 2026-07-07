import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Group } from '../data/familyChats';
import type { ChatGroup } from '../store/AppStore';

export type ChatsStackParamList = {
  ChatList: undefined;
  // Thread operates on the real, server-backed chat group.
  Thread: { group: ChatGroup };
  // Expenses is local-only (Phase A/pre-existing) and keyed by the static
  // display-name roster shape — see model.ts's `Group`.
  Expenses: { group: Group };
  NewChat: undefined;
};

// The Family hub tab: a Card grid linking to Calendar, Grocery, Tasks, Albums,
// Memories, AI Search. Calendar/Grocery/Tasks/Albums are wired up as of
// Phase E — Memories/AI Search still render as "Soon" cards on FamilyHub
// until their phases land.
export type FamilyStackParamList = {
  FamilyHub: undefined;
  Calendar: undefined;
  Grocery: undefined;
  Tasks: undefined;
  Albums: undefined;
  // `name` is a render-immediately fallback; the screen prefers the live
  // album from the store (rename/photoCount updates) once available.
  Album: { albumId: string; name: string };
};

export type RootTabParamList = {
  Chats: NavigatorScreenParams<ChatsStackParamList>;
  Family: NavigatorScreenParams<FamilyStackParamList>;
  Map: undefined;
  You: undefined;
};
