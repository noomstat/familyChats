import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Button } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { ConversationRow } from '../components/chat';
import { useActions, useFriendChatRows, useFriends, useGroups } from '../store';
import { fileUrl } from '../api/client';
import type { Friend } from '../api/client';
import type { FriendsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendsList'>;

// Phase V — friends roster + friend-conversation list (DMs + friend groups) +
// entry points to add a friend (Phase U) or start a new friend group.
export function FriendsListScreen({ navigation }: Props) {
  const friends = useFriends();
  const convos = useFriendChatRows();
  const groups = useGroups();
  const actions = useActions();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const openFriend = async (friend: Friend) => {
    if (openingId) return;
    setOpeningId(friend.id);
    try {
      const group = await actions.openDm(friend.id);
      navigation.navigate('FriendThread', { group });
    } catch (err) {
      Alert.alert('Could not open chat', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: semantic.textStrong, lineHeight: 28 }}>Friends</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>
            {friends.length} friend{friends.length === 1 ? '' : 's'}
          </Text>
        </View>
        <IconButton name="users" variant="soft" accessibilityLabel="New group" onPress={() => navigation.navigate('NewFriendGroup')} />
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
          ListHeaderComponent={
            convos.length > 0 ? (
              <View style={{ gap: 10, marginBottom: 18 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Conversations</Text>
                {convos.map((row) => (
                  <ConversationRow
                    key={row.id}
                    {...row}
                    onPress={() => {
                      const g = groups[row.id];
                      if (g) navigation.navigate('FriendThread', { group: g });
                    }}
                  />
                ))}
              </View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: 4 }} />}
          renderItem={({ item }) => (
            <FriendRow friend={item} loading={openingId === item.id} onPress={() => openFriend(item)} />
          )}
          ListHeaderComponentStyle={{ marginBottom: 4 }}
        />
      )}
    </SafeAreaView>
  );
}

function FriendRow({ friend, loading, onPress }: { friend: Friend; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
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
      <Avatar src={fileUrl(friend.photoUrl)} name={friend.name} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>{friend.name}</Text>
        <Text style={{ fontSize: 12, color: semantic.textMuted }}>@{friend.username}</Text>
      </View>
      {loading ? <ActivityIndicator size="small" color={colors.coral500} /> : <Icon name="chevron-right" size={18} color={semantic.textFaint} />}
    </Pressable>
  );
}
