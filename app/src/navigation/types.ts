import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Group } from '../data/rally';

export type ChatsStackParamList = {
  ChatList: undefined;
  Thread: { group: Group };
  Expenses: { group: Group };
};

export type RootTabParamList = {
  Chats: NavigatorScreenParams<ChatsStackParamList>;
  Map: undefined;
  You: undefined;
};
