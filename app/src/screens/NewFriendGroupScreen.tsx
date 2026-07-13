// Phase V — pick friends to start a friend group (mirrors NewChatScreen's
// family-group creation flow). createFriendGroup generates a random key
// client-side and wraps a copy to every selected friend before ever
// contacting the server — see store/AppStore.tsx's createFriendGroup action.
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily } from '../theme';
import { Button, Chip, Icon, IconButton, Input } from '../components/core';
import { useActions, useFriends } from '../store';
import type { FriendsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FriendsStackParamList, 'NewFriendGroup'>;

export function NewFriendGroupScreen({ navigation }: Props) {
  const friends = useFriends();
  const actions = useActions();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const canCreate = name.trim().length > 0 && selected.length > 0 && !creating;

  const create = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const group = await actions.createFriendGroup(name.trim(), selected);
      navigation.replace('FriendThread', { group });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the group');
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong }}>New group</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Group name</Text>
          <Input value={name} onChangeText={setName} placeholder="e.g. Trip crew" />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Friends ({selected.length})</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {friends.map((f) => {
              const on = selected.includes(f.id);
              return (
                <Chip key={f.id} selected={on} onPress={() => toggle(f.id)} leading={on ? <Icon name="check-circle-2" size={15} color={colors.white} /> : undefined}>
                  {f.name}
                </Chip>
              );
            })}
            {friends.length === 0 && <Text style={{ fontSize: 13, color: semantic.textFaint }}>Add some friends first.</Text>}
          </View>
        </View>

        {!!error && <Text style={{ color: semantic.danger, fontSize: 13 }}>{error}</Text>}

        <Button block size="lg" disabled={!canCreate} onPress={create} leadingIcon={<Icon name="plus" size={18} color={colors.white} />}>
          {creating ? 'Creating…' : 'Create group'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
