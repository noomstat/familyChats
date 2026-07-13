import React from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Button } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { useFriends } from '../store';
import type { Friend } from '../api/client';
import type { FriendsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendsList'>;

// Phase U — friends list + empty state + "Add friend" entry point. No chat
// yet (Phase V) — tapping a friend row is currently a "coming soon" placeholder.
export function FriendsListScreen({ navigation }: Props) {
  const friends = useFriends();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: semantic.textStrong, lineHeight: 28 }}>Friends</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>
            {friends.length} friend{friends.length === 1 ? '' : 's'}
          </Text>
        </View>
        <IconButton name="user-plus" variant="primary" accessibilityLabel="Add friend" onPress={() => navigation.navigate('AddFriend')} />
      </View>

      {friends.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.full,
              backgroundColor: semantic.surfaceSunk,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="users" size={32} color={semantic.textFaint} />
          </View>
          <Text style={{ textAlign: 'center', color: semantic.textMuted, fontSize: fontSize.bodyMd, lineHeight: 20 }}>
            No friends yet — share your QR code or scan a friend's to connect instantly.
          </Text>
          <Button onPress={() => navigation.navigate('AddFriend')} leadingIcon={<Icon name="user-plus" size={18} color={colors.white} />}>
            Add a friend
          </Button>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
          renderItem={({ item }) => (
            <FriendRow
              friend={item}
              onPress={() =>
                Alert.alert('Chat coming soon', `Chatting with ${item.name} isn't available yet — it's coming in a future update.`)
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function FriendRow({ friend, onPress }: { friend: Friend; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: semantic.surfaceCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: semantic.borderSubtle,
        padding: 14,
        ...shadow.xs,
      }}
    >
      <Avatar name={friend.name} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>{friend.name}</Text>
        <Text style={{ fontSize: 12, color: semantic.textMuted }}>@{friend.username}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={semantic.textFaint} />
    </Pressable>
  );
}
