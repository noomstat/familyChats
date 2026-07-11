import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Input, Button } from '../components/core';
import { useActions, useAlbums } from '../store';
import { fileUrl, ServerAlbum } from '../api/client';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Albums'>;

type Sheet =
  | { mode: 'create' }
  | { mode: 'manage'; album: ServerAlbum }
  | { mode: 'rename'; album: ServerAlbum }
  | { mode: 'confirm-delete'; album: ServerAlbum };

export function AlbumsScreen({ navigation }: Props) {
  const albums = useAlbums(); // sorted by creation time
  const [sheet, setSheet] = useState<Sheet | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Albums</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>
            {albums.length} {albums.length === 1 ? 'album' : 'albums'}
          </Text>
        </View>
        <IconButton name="plus" variant="primary" accessibilityLabel="New album" onPress={() => setSheet({ mode: 'create' })} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {albums.length === 0 ? (
          <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 40, fontSize: fontSize.bodySm }}>
            No albums yet — create the first one.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onPress={() => navigation.navigate('Album', { albumId: album.id, name: album.name })}
                onLongPress={() => setSheet({ mode: 'manage', album })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {sheet?.mode === 'create' && <CreateAlbumSheet onClose={() => setSheet(null)} />}
      {sheet?.mode === 'manage' && (
        <ManageAlbumSheet
          album={sheet.album}
          onRename={() => setSheet({ mode: 'rename', album: sheet.album })}
          onDelete={() => setSheet({ mode: 'confirm-delete', album: sheet.album })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.mode === 'rename' && <RenameAlbumSheet album={sheet.album} onClose={() => setSheet(null)} />}
      {sheet?.mode === 'confirm-delete' && <ConfirmDeleteSheet album={sheet.album} onClose={() => setSheet(null)} />}
    </SafeAreaView>
  );
}

function AlbumCard({ album, onPress, onLongPress }: { album: ServerAlbum; onPress: () => void; onLongPress: () => void }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width: '48%', marginBottom: 14 }}>
      <View
        style={{
          backgroundColor: semantic.surfaceCard,
          borderWidth: 1,
          borderColor: semantic.borderSubtle,
          borderRadius: radius.lg,
          overflow: 'hidden',
          ...shadow.sm,
        }}
      >
        {album.coverPath ? (
          <Image source={{ uri: fileUrl(album.coverPath) }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', aspectRatio: 1, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="image" size={30} color={semantic.textFaint} />
          </View>
        )}
        <View style={{ padding: 12 }}>
          <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: semantic.textStrong }}>
            {album.name}
          </Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted, marginTop: 2 }}>
            {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Bottom sheets ────────────────────────────────────────────

function SheetShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <View
        style={{
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
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

function CreateAlbumSheet({ onClose }: { onClose: () => void }) {
  const actions = useActions();
  const [name, setName] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    actions.createAlbum(name.trim()).catch((err) => console.warn('[albums] create failed', err));
    onClose();
  };

  return (
    <SheetShell onClose={onClose}>
      <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>New album</Text>
      <Input value={name} onChangeText={setName} placeholder="e.g. Summer 2026" onSubmitEditing={submit} />
      <Button block size="lg" disabled={!name.trim()} onPress={submit} leadingIcon={<Icon name="plus" size={18} color={colors.white} />}>
        Create album
      </Button>
    </SheetShell>
  );
}

function ManageAlbumSheet({
  album,
  onRename,
  onDelete,
  onClose,
}: {
  album: ServerAlbum;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <SheetShell onClose={onClose}>
      <Text numberOfLines={1} style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>
        {album.name}
      </Text>
      <Button block variant="secondary" onPress={onRename} leadingIcon={<Icon name="pencil" size={17} color={semantic.textStrong} />}>
        Rename
      </Button>
      <Button block variant="danger" onPress={onDelete} leadingIcon={<Icon name="trash" size={17} color={colors.white} />}>
        Delete album
      </Button>
    </SheetShell>
  );
}

function RenameAlbumSheet({ album, onClose }: { album: ServerAlbum; onClose: () => void }) {
  const actions = useActions();
  const [name, setName] = useState(album.name);

  const submit = () => {
    if (!name.trim()) return;
    actions.renameAlbum(album.id, name.trim());
    onClose();
  };

  return (
    <SheetShell onClose={onClose}>
      <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>Rename album</Text>
      <Input value={name} onChangeText={setName} placeholder="Album name" onSubmitEditing={submit} />
      <Button block size="lg" disabled={!name.trim()} onPress={submit} leadingIcon={<Icon name="check" size={18} color={colors.white} />}>
        Save
      </Button>
    </SheetShell>
  );
}

function ConfirmDeleteSheet({ album, onClose }: { album: ServerAlbum; onClose: () => void }) {
  const actions = useActions();

  const remove = () => {
    actions.removeAlbum(album.id);
    onClose();
  };

  return (
    <SheetShell onClose={onClose}>
      <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>Delete “{album.name}”?</Text>
      <Text style={{ fontSize: fontSize.bodySm, color: semantic.textMuted }}>
        This removes the album and its {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'} for everyone. It can’t be undone.
      </Text>
      <Button block variant="danger" onPress={remove} leadingIcon={<Icon name="trash" size={17} color={colors.white} />}>
        Delete album
      </Button>
      <Button block variant="ghost" onPress={onClose}>
        Cancel
      </Button>
    </SheetShell>
  );
}
