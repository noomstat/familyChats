import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Button, Icon, IconButton, Badge } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { CATEGORIES, INCOME, PEOPLE, RECEIPT, TOTAL, YOU, money } from '../data/familyChats';
import type { ChatsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ChatsStackParamList, 'Expenses'>;

type ViewMode = 'category' | 'people';

export function ExpensesScreen({ route, navigation }: Props) {
  const { group } = route.params;
  const [view, setView] = useState<ViewMode>('category');
  const [receipt, setReceipt] = useState(false);
  const net = YOU.paid - YOU.share; // +owed / -owes

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Expenses</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>{group.name} · {group.members ?? 1} people</Text>
        </View>
        <IconButton name="share-2" variant="soft" accessibilityLabel="Share receipt" onPress={() => setReceipt(true)} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {/* balance hero */}
        <View style={{ backgroundColor: colors.ink900, borderRadius: radius.xl, padding: 20, paddingVertical: 18 }}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.ping300 }}>
            You're owed
          </Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 42, letterSpacing: -0.8, color: colors.white, marginTop: 2, marginBottom: 12 }}>
            {money(net)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <MiniStat label="You paid" value={money(YOU.paid)} tone={colors.white} />
            <MiniStat label="Your share" value={money(YOU.share)} tone={colors.ink200} />
          </View>
        </View>

        {/* income / expense strip */}
        <View style={{ flexDirection: 'row', gap: 10, marginVertical: 14 }}>
          <TotalCard icon="arrow-down-left" label="Expenses" value={money(TOTAL)} color={colors.coral600} bg={semantic.brandSoft} />
          <TotalCard icon="arrow-up-right" label="Income" value={money(INCOME.amount)} color={colors.ping700} bg={semantic.liveSoft} />
        </View>

        <Segmented value={view} onChange={setView} options={[['category', 'By category'], ['people', 'By people']]} />

        <View style={{ marginTop: 14 }}>{view === 'category' ? <ByCategory /> : <ByPeople />}</View>
      </ScrollView>

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, backgroundColor: semantic.surfaceCard, borderTopWidth: 1, borderTopColor: semantic.borderSubtle }}>
        <Button variant="secondary" leadingIcon={<Icon name="receipt" size={17} color={semantic.textStrong} />} onPress={() => setReceipt(true)}>
          Receipt
        </Button>
        <View style={{ flex: 1 }}>
          <Button block leadingIcon={<Icon name="plus" size={18} color={colors.white} />}>
            Add expense
          </Button>
        </View>
      </View>

      {receipt && <ReceiptSheet groupName={group.name} onClose={() => setReceipt(false)} />}
    </SafeAreaView>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 11, color: colors.ink300 }}>{label}</Text>
      <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 15, color: tone }}>{value}</Text>
    </View>
  );
}

function TotalCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: radius.lg, padding: 14, paddingVertical: 12, borderWidth: 1, borderColor: semantic.borderSubtle }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon name={icon} size={15} color={color} />
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12, color }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 20, color: semantic.textStrong }}>{value}</Text>
    </View>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  options: [ViewMode, string][];
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, backgroundColor: semantic.surfaceSunk, borderRadius: radius.full, padding: 4 }}>
      {options.map(([id, label]) => {
        const on = value === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? semantic.surfaceCard : 'transparent',
              ...(on ? shadow.sm : {}),
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: on ? semantic.textStrong : semantic.textMuted }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ByCategory() {
  const max = Math.max(...CATEGORIES.map((c) => c.amount));
  return (
    <View style={{ gap: 6 }}>
      {CATEGORIES.map((c) => (
        <View key={c.id} style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} size={19} color={c.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{c.label}</Text>
                <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 15, color: semantic.textStrong }}>{money(c.amount)}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 99, backgroundColor: semantic.surfaceSunk, marginTop: 7, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${(c.amount / max) * 100}%`, backgroundColor: c.color, borderRadius: 99 }} />
              </View>
            </View>
          </View>
        </View>
      ))}
      {/* income row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, marginTop: 4, borderTopWidth: 1, borderTopColor: semantic.borderDefault, borderStyle: 'dashed' }}>
        <View style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: semantic.liveSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={INCOME.icon} size={19} color={colors.ping600} />
        </View>
        <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{INCOME.label}</Text>
        <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 15, color: colors.ping700 }}>+{money(INCOME.amount)}</Text>
      </View>
    </View>
  );
}

function ByPeople() {
  return (
    <View style={{ gap: 8 }}>
      {PEOPLE.map((p) => {
        const net = p.paid - p.share;
        const isYou = p.name === 'You Now';
        return (
          <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 }}>
            <Avatar name={p.name} size={42} presence={isYou ? null : 'online'} ring={isYou} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{isYou ? 'You' : p.name}</Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>
                paid {money(p.paid)} · share {money(p.share)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 15, color: net >= 0 ? colors.ping700 : colors.coral600 }}>
                {net >= 0 ? '+' : ''}
                {money(net)}
              </Text>
              <Text style={{ fontSize: 11, color: semantic.textFaint }}>{net > 0 ? 'owed' : net < 0 ? 'owes' : 'settled'}</Text>
            </View>
            {net < 0 && (
              <Button size="sm" variant="live">
                Settle
              </Button>
            )}
          </View>
        );
      })}
    </View>
  );
}

function ReceiptSheet({ groupName, onClose }: { groupName: string; onClose: () => void }) {
  const [shared, setShared] = useState(false);
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}>
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
          ...shadow.xl,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: semantic.borderStrong, alignSelf: 'center', marginBottom: 16 }} />
        {/* receipt paper */}
        <View style={{ backgroundColor: semantic.surfacePage, borderWidth: 1, borderColor: semantic.borderDefault, borderRadius: radius.md, padding: 18, paddingBottom: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 19, color: semantic.textStrong }}>{RECEIPT.merchant}</Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: semantic.textMuted }}>
                {RECEIPT.date} · paid by {RECEIPT.paidBy}
              </Text>
            </View>
            <Badge tone="brand" size="sm">
              {RECEIPT.category}
            </Badge>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: semantic.borderStrong, borderStyle: 'dashed', paddingTop: 12, gap: 8 }}>
            {RECEIPT.items.map(([label, amt]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: semantic.textBody }}>{label}</Text>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 14, color: semantic.textBody }}>{money(amt)}</Text>
              </View>
            ))}
          </View>
          <View style={{ borderTopWidth: 2, borderTopColor: colors.ink900, marginTop: 12, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: fontFamily.bodyBold, color: semantic.textStrong, fontSize: 15 }}>Total</Text>
            <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 20, color: semantic.textStrong }}>{money(RECEIPT.total)}</Text>
          </View>
          {/* split-among row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: semantic.borderStrong, borderStyle: 'dashed' }}>
            <Text style={{ fontSize: 12, color: semantic.textMuted, marginRight: 2 }}>Split among</Text>
            <View style={{ flexDirection: 'row' }}>
              {['You', 'Mara', 'Dev', 'Sam'].map((n, i) => (
                <View key={n} style={{ marginLeft: i ? -8 : 0, borderRadius: 999, borderWidth: 2, borderColor: semantic.surfacePage }}>
                  <Avatar name={n} size={26} />
                </View>
              ))}
            </View>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted, marginLeft: 'auto' }}>
              {money(RECEIPT.total / 4)}/person
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          {shared ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: radius.full, backgroundColor: semantic.liveSoft }}>
              <Icon name="check-circle-2" size={20} color={colors.ping600} />
              <Text style={{ color: colors.ping700, fontFamily: fontFamily.bodyBold, fontSize: fontSize.bodyMd }}>Shared to {groupName}</Text>
            </View>
          ) : (
            <Button block size="lg" leadingIcon={<Icon name="send" size={18} color={colors.white} />} onPress={() => setShared(true)}>
              Share to chat
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
