import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily } from '../theme';
import { Button, Chip, Icon, IconButton, Input } from '../components/core';
import { useActions, useFamily, useSession } from '../store';
import type { ChatsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ChatsStackParamList, 'NewChat'>;

export function NewChatScreen({ navigation }: Props) {
  const family = useFamily();
  const session = useSession();
  const actions = useActions();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const others = (family?.members ?? []).filter((m) => m.id !== session?.userId);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const canCreate = name.trim().length > 0 && selected.length > 0 && !creating && !!family && !!session;

  const create = async () => {
    if (!canCreate || !family || !session) return;
    setCreating(true);
    setError(null);
    try {
      const groupId = await actions.createGroup(name.trim(), selected);
      navigation.replace('Thread', {
        group: { id: groupId, familyId: family.id, name: name.trim(), members: [...selected, session.userId] },
      });
    } catch (err: any) {
      setError(err?.message ?? 'Could not create the group');
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong }}>New chat</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Group name</Text>
          <Input value={name} onChangeText={setName} placeholder="e.g. Weekend Plans" />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>Members ({selected.length})</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {others.map((m) => {
              const on = selected.includes(m.id);
              return (
                <Chip
                  key={m.id}
                  selected={on}
                  onPress={() => toggle(m.id)}
                  leading={on ? <Icon name="check-circle-2" size={15} color={colors.white} /> : undefined}
                >
                  {m.name}
                </Chip>
              );
            })}
            {others.length === 0 && (
              <Text style={{ fontSize: 13, color: semantic.textFaint }}>No other family members yet.</Text>
            )}
          </View>
        </View>

        {!!error && <Text style={{ color: semantic.danger, fontSize: 13 }}>{error}</Text>}

        <Button block size="lg" disabled={!canCreate} onPress={create} leadingIcon={<Icon name="plus" size={18} color={colors.white} />}>
          {creating ? 'Creating…' : 'Create chat'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
