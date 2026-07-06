import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { semantic, fontFamily, radius } from '../theme';
import { Icon, Switch, Card } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { useActions, useFamily, useSession } from '../store';

const ROWS: [string, string, 'toggle' | 'chev'][] = [
  ['navigation', 'Share live by default', 'toggle'],
  ['bell', 'Notifications', 'chev'],
  ['users', 'Manage groups', 'chev'],
  ['lock', 'Privacy & who can see me', 'chev'],
];

export function YouScreen() {
  const [live, setLive] = useState(true);
  const session = useSession();
  const family = useFamily();
  const actions = useActions();

  const displayName = session?.name ?? 'You';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }}>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
          <Avatar name={displayName} size={88} ring />
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: semantic.textStrong }}>{displayName}</Text>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>
            @{session?.username ?? 'you'}
            {family ? ` · ${family.name} · ${family.inviteCode}` : ''}
          </Text>
        </View>
        <Card padding="none" style={{ overflow: 'hidden' }}>
          {ROWS.map(([ic, label, kind], i) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: semantic.borderSubtle,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ic} size={18} color={semantic.textBody} />
              </View>
              <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{label}</Text>
              {kind === 'toggle' ? (
                <Switch checked={live} onChange={setLive} tone="live" />
              ) : (
                <Icon name="chevron-right" size={18} color={semantic.textFaint} />
              )}
            </View>
          ))}
        </Card>

        <Card padding="none" style={{ overflow: 'hidden', marginTop: 16 }}>
          <Pressable
            onPress={() => actions.logout()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: semantic.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="log-out" size={18} color={semantic.danger} />
            </View>
            <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.danger, fontSize: 15 }}>Log out</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
