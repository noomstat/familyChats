import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius } from '../theme';
import { Icon, IconButton, Input, Button, Chip } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { useActions, useFamily, useGrocery } from '../store';
import { fileUrl } from '../api/client';
import type { ServerGroceryItem } from '../api/client';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Grocery'>;

/** Parses "Milk x2" -> { label: 'Milk', qty: '2' }; falls back to no qty. */
function parseGroceryInput(raw: string): { label: string; qty?: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s+x(\d+)$/i);
  if (match && match[1].trim()) {
    return { label: match[1].trim(), qty: match[2] };
  }
  return { label: trimmed };
}

export function GroceryScreen({ navigation }: Props) {
  const family = useFamily();
  const items = useGrocery(); // sorted unchecked-first, then ts
  const actions = useActions();
  const [draft, setDraft] = useState('');

  const unchecked = items.filter((i) => !i.checkedBy);
  const checked = items.filter((i) => i.checkedBy);

  const submit = () => {
    const parsed = parseGroceryInput(draft);
    if (!parsed.label) return;
    actions.addGrocery(parsed.label, parsed.qty);
    setDraft('');
  };

  const nameOf = (id: string | null) => family?.members.find((m) => m.id === id)?.name;
  const photoOf = (id: string | null) => family?.members.find((m) => m.id === id)?.photoUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Grocery</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>
            {unchecked.length} to buy{family ? ` · ${family.name}` : ''}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Input value={draft} onChangeText={setDraft} placeholder="Add item… e.g. Milk x2" onSubmitEditing={submit} />
        </View>
        <IconButton
          name={draft.trim() ? 'send' : 'plus'}
          variant="primary"
          accessibilityLabel="Add item"
          onPress={submit}
          disabled={!draft.trim()}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {items.length === 0 ? (
          <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 40, fontSize: fontSize.bodySm }}>
            Nothing on the list — add something above.
          </Text>
        ) : (
          <>
            {unchecked.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                checkerName={nameOf(item.checkedBy)}
                checkerPhoto={photoOf(item.checkedBy)}
                onToggle={() => actions.toggleGrocery(item.id)}
                onRemove={() => actions.removeGrocery(item.id)}
              />
            ))}

            {checked.length > 0 && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginHorizontal: 16,
                    marginTop: 14,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: semantic.borderStrong,
                    borderStyle: 'dashed',
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12, color: semantic.textFaint }}>
                    Checked ({checked.length})
                  </Text>
                  <Button variant="ghost" size="sm" onPress={() => actions.clearCheckedGrocery()}>
                    Clear checked
                  </Button>
                </View>
                {checked.map((item) => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    checkerName={nameOf(item.checkedBy)}
                    onToggle={() => actions.toggleGrocery(item.id)}
                    onRemove={() => actions.removeGrocery(item.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GroceryRow({
  item,
  checkerName,
  checkerPhoto,
  onToggle,
  onRemove,
}: {
  item: ServerGroceryItem;
  checkerName?: string;
  checkerPhoto?: string | null;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const checked = !!item.checkedBy;
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onRemove}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.full,
          borderWidth: checked ? 0 : 2,
          borderColor: semantic.borderStrong,
          backgroundColor: checked ? semantic.brand : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Icon name="check" size={14} color={colors.white} />}
      </View>
      <Text
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: fontFamily.bodyMedium,
          fontSize: 15,
          color: checked ? semantic.textFaint : semantic.textStrong,
          textDecorationLine: checked ? 'line-through' : 'none',
        }}
      >
        {item.label}
      </Text>
      {!!item.qty && <Chip tone="neutral">{item.qty}</Chip>}
      {checked && !!checkerName && <Avatar src={fileUrl(checkerPhoto)} name={checkerName} size={22} />}
    </Pressable>
  );
}
