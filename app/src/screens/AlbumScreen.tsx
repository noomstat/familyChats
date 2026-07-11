import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize } from '../theme';
import { Icon, IconButton, Button } from '../components/core';
import { useActions, useAlbumPhotos, useAlbums, useFamily } from '../store';
import { fileUrl, ServerPhoto } from '../api/client';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Album'>;

function dateLabel(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AlbumScreen({ navigation, route }: Props) {
  const { albumId, name: fallbackName } = route.params;
  const albums = useAlbums();
  const photos = useAlbumPhotos(albumId); // undefined until loaded
  const family = useFamily();
  const actions = useActions();

  const album = albums.find((a) => a.id === albumId);
  const name = album?.name ?? fallbackName;

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ServerPhoto | null>(null);

  // Photos never ride along in bootstrap/sync — fetch (or refresh) on open.
  useEffect(() => {
    actions.loadPhotos(albumId).catch((err) => console.warn('[album] loadPhotos failed', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  const addPhoto = async () => {
    if (uploading) return;
    setUploadError(null);
    setUploading(true);
    try {
      await actions.addPhotoFromPicker(albumId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photo: ServerPhoto) => {
    actions.removePhoto(photo.id, photo.albumId);
    setViewer(null);
  };

  const count = photos?.length ?? album?.photoCount ?? 0;
  const uploaderName = (id: string | null) => family?.members.find((m) => m.id === id)?.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>
            {name}
          </Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>
            {count} {count === 1 ? 'photo' : 'photos'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        {photos === undefined ? (
          <ActivityIndicator color={semantic.brand} style={{ padding: 40 }} />
        ) : photos.length === 0 ? (
          <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 40, fontSize: fontSize.bodySm }}>
            No photos yet — add the first one.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {photos.map((photo) => (
              <Pressable key={photo.id} onPress={() => setViewer(photo)} style={{ width: '32%', aspectRatio: 1 }}>
                <Image
                  source={{ uri: fileUrl(photo.filePath) }}
                  style={{ width: '100%', height: '100%', borderRadius: 8, backgroundColor: semantic.surfaceSunk }}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
        {!!uploadError && (
          <Text style={{ textAlign: 'center', color: semantic.danger, fontSize: 12 }}>{uploadError}</Text>
        )}
        <Button
          block
          size="lg"
          disabled={uploading}
          onPress={addPhoto}
          leadingIcon={
            uploading ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="camera" size={18} color={colors.white} />
          }
        >
          {uploading ? 'Uploading…' : 'Add photos'}
        </Button>
      </View>

      {viewer && (
        <PhotoViewer
          photo={viewer}
          uploaderName={uploaderName(viewer.uploaderId)}
          onDelete={() => removePhoto(viewer)}
          onClose={() => setViewer(null)}
        />
      )}
    </SafeAreaView>
  );
}

function PhotoViewer({
  photo,
  uploaderName,
  onDelete,
  onClose,
}: {
  photo: ServerPhoto;
  uploaderName?: string;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,10,8,0.94)' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 }}>
          <ViewerControl name="x" label="Close" onPress={onClose} />
          {confirmDelete ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable onPress={onDelete} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: semantic.danger }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: colors.white }}>Delete photo</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmDelete(false)} style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: colors.white }}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <ViewerControl name="trash" label="Delete photo" onPress={() => setConfirmDelete(true)} />
          )}
        </View>

        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <Image source={{ uri: fileUrl(photo.filePath) }} style={{ flex: 1 }} resizeMode="contain" />
        </Pressable>

        <View style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 4 }}>
          {!!photo.caption && (
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 15, color: colors.white }}>{photo.caption}</Text>
          )}
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            {[uploaderName, dateLabel(photo.ts)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** IconButton's palette assumes light surfaces — the viewer's controls need white glyphs on the dark backdrop. */
function ViewerControl({ name, label, onPress }: { name: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}
    >
      <Icon name={name} size={20} color={colors.white} />
    </Pressable>
  );
}
