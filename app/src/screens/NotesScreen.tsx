import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Input, Button } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { useActions, useE2EE, useFamily, useNotes, type Note } from '../store';
import { timeLabel } from '../store/model';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Notes'>;

export function NotesScreen({ navigation }: Props) {
  const family = useFamily();
  const notes = useNotes(); // sorted most-recently-updated first
  const { hasKey } = useE2EE();
  const actions = useActions();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const memberOf = (id: string | null) => family?.members.find((m) => m.id === id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Notes</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>{notes.length} note{notes.length === 1 ? '' : 's'} · end-to-end encrypted</Text>
        </View>
        <IconButton name="plus" variant="primary" accessibilityLabel="New note" disabled={!hasKey} onPress={() => setAdding(true)} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}>
        {!hasKey && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: semantic.surfaceSunk,
              marginBottom: 4,
            }}
          >
            <Icon name="lock" size={16} color={semantic.textMuted} />
            <Text style={{ flex: 1, fontSize: 12, color: semantic.textMuted }}>
              Enter your family key (You tab) to read and write notes.
            </Text>
          </View>
        )}

        {notes.length === 0 ? (
          <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 40, fontSize: fontSize.bodySm }}>
            No notes yet — add the first one.
          </Text>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              authorName={memberOf(note.createdBy)?.name}
              onPress={() => {
                if (!note.locked) setEditing(note);
              }}
              onRemove={() => actions.removeNote(note.id)}
            />
          ))
        )}
      </ScrollView>

      {adding && <NoteSheet onClose={() => setAdding(false)} onSubmit={(title, body) => actions.addNote(title, body)} />}
      {editing && (
        <NoteSheet
          initialTitle={editing.title}
          initialBody={editing.body}
          onClose={() => setEditing(null)}
          onSubmit={(title, body) => actions.updateNote(editing.id, title, body)}
        />
      )}
    </SafeAreaView>
  );
}

function NoteCard({
  note,
  authorName,
  onPress,
  onRemove,
}: {
  note: Note;
  authorName?: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  if (note.locked) {
    return (
      <Pressable
        onLongPress={onRemove}
        style={{
          backgroundColor: semantic.surfaceCard,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: semantic.borderSubtle,
          padding: 16,
          opacity: 0.6,
          ...shadow.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="lock" size={15} color={semantic.textMuted} />
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, fontStyle: 'italic', color: semantic.textMuted }}>
            Encrypted note — enter your family key
          </Text>
        </View>
      </Pressable>
    );
  }

  const preview = (note.body ?? '').trim();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onRemove}
      style={{
        backgroundColor: semantic.surfaceCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: semantic.borderSubtle,
        padding: 16,
        gap: 6,
        ...shadow.xs,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }} numberOfLines={1}>
        {note.title || 'Untitled note'}
      </Text>
      {!!preview && (
        <Text style={{ fontSize: 13, color: semantic.textMuted, lineHeight: 18 }} numberOfLines={2}>
          {preview}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        {authorName && <Avatar name={authorName} size={18} />}
        <Text style={{ fontSize: 11, color: semantic.textFaint }}>
          {[authorName, timeLabel(Date.parse(note.updatedAt))].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

function NoteSheet({
  initialTitle = '',
  initialBody = '',
  onClose,
  onSubmit,
}: {
  initialTitle?: string;
  initialBody?: string;
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  const submit = () => {
    if (!title.trim() && !body.trim()) return;
    onSubmit(title.trim(), body.trim());
    onClose();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}
    >
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <ScrollView
        style={{ maxHeight: '88%' }}
        contentContainerStyle={{
          backgroundColor: semantic.surfaceCard,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 28,
          gap: 16,
          ...shadow.xl,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: semantic.borderStrong, alignSelf: 'center' }} />
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>
          {initialTitle || initialBody ? 'Edit note' : 'New note'}
        </Text>

        <Field label="Title">
          <Input value={title} onChangeText={setTitle} placeholder="e.g. Wi-Fi password" />
        </Field>

        <Field label="Note">
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write something…"
            placeholderTextColor={semantic.textFaint}
            multiline
            style={{
              minHeight: 120,
              backgroundColor: semantic.surfaceSunk,
              borderWidth: 1.5,
              borderColor: semantic.borderDefault,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: fontFamily.body,
              fontSize: fontSize.bodyMd,
              color: semantic.textStrong,
              textAlignVertical: 'top',
            }}
          />
        </Field>

        <Button block size="lg" disabled={!title.trim() && !body.trim()} onPress={submit} leadingIcon={<Icon name="plus" size={18} color={colors.white} />}>
          Save note
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>{label}</Text>
      {children}
    </View>
  );
}
