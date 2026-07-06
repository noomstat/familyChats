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

export type RootTabParamList = {
  Chats: NavigatorScreenParams<ChatsStackParamList>;
  Map: undefined;
  You: undefined;
};
