import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Button, Icon, IconButton, Input, Chip } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import {
  CATEGORIES,
  CategoryId,
  FinCategoryTotal,
  FinPersonBalance,
  thb,
  useActions,
  useFamily,
  useFinance,
  useSession,
} from '../store';
import { fileUrl } from '../api/client';
import type { FamilyMember, ServerExpense } from '../api/client';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Finance'>;

type ViewMode = 'category' | 'people';

export function FinanceScreen({ navigation }: Props) {
  const family = useFamily();
  const session = useSession();
  const finance = useFinance();
  const actions = useActions();
  const [view, setView] = useState<ViewMode>('category');
  const [adding, setAdding] = useState(false);
  const [settingBudget, setSettingBudget] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const members = family?.members ?? [];
  const nameOf = (id: string) => (id === session?.userId ? 'You' : members.find((m) => m.id === id)?.name ?? id);

  const budgetAmount = finance.budget?.amount ?? 0;
  const over = budgetAmount > 0 && finance.remaining < 0;
  const progress = budgetAmount > 0 ? Math.min(1, finance.spent / budgetAmount) : 0;

  const recent = [...finance.expenses].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));

  const removeWithConfirm = (id: string) => {
    if (confirmingId === id) {
      actions.removeExpense(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId((cur) => (cur === id ? null : cur)), 3000);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Family Finance</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>{family?.name ?? 'Family'} · {members.length} people</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {/* budget hero */}
        <Pressable onPress={() => setSettingBudget(true)}>
          <View style={{ backgroundColor: colors.ink900, borderRadius: radius.xl, padding: 20, paddingVertical: 18 }}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink300 }}>
              Monthly budget
            </Text>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 42, letterSpacing: -0.8, color: colors.white, marginTop: 2, marginBottom: 12 }}>
              {finance.budget ? thb(budgetAmount) : 'Set a budget'}
            </Text>
            {finance.budget && (
              <View style={{ height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginBottom: 12 }}>
                <View
                  style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    backgroundColor: over ? semantic.danger : colors.coral500,
                    borderRadius: 99,
                  }}
                />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <MiniStat label="Spent" value={thb(finance.spent)} tone={colors.white} />
              <MiniStat label="Remaining" value={thb(finance.remaining)} tone={over ? colors.coral300 : colors.ping300} />
            </View>
          </View>
        </Pressable>

        <View style={{ marginTop: 14 }}>
          <Segmented value={view} onChange={setView} options={[['category', 'By category'], ['people', 'By people']]} />
        </View>

        <View style={{ marginTop: 14 }}>
          {view === 'category' ? (
            <>
              <ByCategory summary={finance.summary} />
              <RecentExpenses
                expenses={recent}
                nameOf={nameOf}
                confirmingId={confirmingId}
                onDelete={removeWithConfirm}
                onPreview={setPreviewUri}
              />
            </>
          ) : (
            <ByPeople summary={finance.summary} me={session?.userId} nameOf={nameOf} actions={actions} />
          )}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 20,
          backgroundColor: semantic.surfaceCard,
          borderTopWidth: 1,
          borderTopColor: semantic.borderSubtle,
        }}
      >
        <Button block size="lg" leadingIcon={<Icon name="plus" size={18} color={colors.white} />} onPress={() => setAdding(true)}>
          Add expense
        </Button>
      </View>

      {adding && <AddExpenseSheet members={members} me={session?.userId} onClose={() => setAdding(false)} />}
      {settingBudget && <SetBudgetSheet current={finance.budget?.amount} onClose={() => setSettingBudget(false)} />}
      {previewUri && <ReceiptPreview uri={previewUri} onClose={() => setPreviewUri(null)} />}
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

function ByCategory({ summary }: { summary: { spendByCategory: FinCategoryTotal[]; income: { label: string; icon: string; amount: number }; incomeTotal: number } }) {
  const cats = summary.spendByCategory;
  const max = Math.max(1, ...cats.map((c) => c.amount));
  return (
    <View style={{ gap: 6 }}>
      {cats.length === 0 && (
        <Text style={{ textAlign: 'center', color: semantic.textFaint, paddingVertical: 24, fontSize: fontSize.bodySm }}>No expenses yet — add the first one.</Text>
      )}
      {cats.map((c) => (
        <View key={c.id} style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: semantic.surfaceSunk, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} size={19} color={c.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{c.label}</Text>
                <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 15, color: semantic.textStrong }}>{thb(c.amount)}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 99, backgroundColor: semantic.surfaceSunk, marginTop: 7, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${(c.amount / max) * 100}%`, backgroundColor: c.color, borderRadius: 99 }} />
              </View>
            </View>
          </View>
        </View>
      ))}
      {summary.incomeTotal > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, marginTop: 4, borderTopWidth: 1, borderTopColor: semantic.borderDefault, borderStyle: 'dashed' }}>
          <View style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: semantic.liveSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={summary.income.icon} size={19} color={colors.ping600} />
          </View>
          <Text style={{ flex: 1, fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{summary.income.label}</Text>
          <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 15, color: colors.ping700 }}>+{thb(summary.income.amount)}</Text>
        </View>
      )}
    </View>
  );
}

function RecentExpenses({
  expenses,
  nameOf,
  confirmingId,
  onDelete,
  onPreview,
}: {
  expenses: ServerExpense[];
  nameOf: (id: string) => string;
  confirmingId: string | null;
  onDelete: (id: string) => void;
  onPreview: (uri: string) => void;
}) {
  if (!expenses.length) return null;
  return (
    <View style={{ marginTop: 18, gap: 4 }}>
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12, color: semantic.textFaint, marginHorizontal: 4, marginBottom: 4 }}>Recent</Text>
      {expenses.map((e) => {
        const meta = CATEGORIES.find((c) => c.id === e.categoryId)!;
        const confirming = confirmingId === e.id;
        return (
          <Pressable
            key={e.id}
            onLongPress={() => onDelete(e.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 9,
              paddingHorizontal: 4,
              backgroundColor: confirming ? semantic.brandSoft : 'transparent',
              borderRadius: radius.md,
            }}
          >
            <Icon name={meta.icon} size={16} color={meta.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: semantic.textStrong }} numberOfLines={1}>
                {e.label}
              </Text>
              <Text style={{ fontSize: 11, color: semantic.textMuted }}>{nameOf(e.paidBy)} paid</Text>
            </View>
            {e.receiptPath && (
              <Pressable onPress={() => onPreview(fileUrl(e.receiptPath!))}>
                <Image source={{ uri: fileUrl(e.receiptPath) }} style={{ width: 28, height: 28, borderRadius: 6 }} />
              </Pressable>
            )}
            <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 14, color: semantic.textStrong }}>{thb(e.amount)}</Text>
            {confirming && <Icon name="trash" size={16} color={semantic.danger} />}
          </Pressable>
        );
      })}
      {confirmingId && (
        <Text style={{ fontSize: 11, color: semantic.textFaint, marginHorizontal: 4, marginTop: 2 }}>Long-press again — tap the highlighted row to delete.</Text>
      )}
    </View>
  );
}

function ByPeople({
  summary,
  me,
  nameOf,
  actions,
}: {
  summary: { people: FinPersonBalance[] };
  me?: string;
  nameOf: (id: string) => string;
  actions: ReturnType<typeof useActions>;
}) {
  const you = summary.people.find((p) => p.userId === me);
  const youNet = you?.net ?? 0;
  return (
    <View style={{ gap: 8 }}>
      {summary.people.map((p) => {
        const isYou = p.userId === me;
        const oweThem = !isYou && youNet < 0 && p.net > 0;
        const theyOweMe = !isYou && p.net < 0;
        return (
          <View key={p.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 }}>
            <Avatar name={nameOf(p.userId)} size={42} ring={isYou} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: 15 }}>{nameOf(p.userId)}</Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>
                paid {thb(p.paid)} · share {thb(p.share)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 15, color: p.net >= 0 ? colors.ping700 : colors.coral600 }}>
                {p.net >= 0 ? '+' : ''}
                {thb(p.net)}
              </Text>
              <Text style={{ fontSize: 11, color: semantic.textFaint }}>{p.net > 0 ? 'owed' : p.net < 0 ? 'owes' : 'settled'}</Text>
            </View>
            {oweThem && (
              <Button size="sm" variant="live" onPress={() => actions.settleUp(p.userId, Math.min(Math.abs(youNet), p.net))}>
                Settle
              </Button>
            )}
            {theyOweMe && <RemindButton onRemind={() => actions.remindPayment(p.userId, Math.abs(p.net))} />}
          </View>
        );
      })}
    </View>
  );
}

function RemindButton({ onRemind }: { onRemind: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const press = async () => {
    if (state !== 'idle') return;
    setState('sending');
    try {
      await onRemind();
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('idle');
    }
  };
  return (
    <Button size="sm" variant="ghost" disabled={state === 'sending'} onPress={press}>
      {state === 'done' ? 'Reminded ✓' : 'Remind'}
    </Button>
  );
}

// ── Add-expense form ─────────────────────────────────────────

function AddExpenseSheet({ members, me, onClose }: { members: FamilyMember[]; me: string | undefined; onClose: () => void }) {
  const actions = useActions();
  const [label, setLabel] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('food');
  const [paidBy, setPaidBy] = useState(me ?? members[0]?.id ?? '');
  const [split, setSplit] = useState<string[]>(members.map((m) => m.id));
  const [receiptPath, setReceiptPath] = useState<string | undefined>(undefined);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);

  const amount = parseFloat(amountStr.replace(',', '.'));
  const valid = label.trim().length > 0 && amount > 0 && split.length > 0 && !!paidBy;

  const toggleSplit = (id: string) => setSplit((s) => (s.includes(id) ? s.filter((n) => n !== id) : [...s, id]));

  const scanReceipt = async () => {
    setScanHint(null);
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setScanHint('Photo library access was denied.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: false });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const name = asset.fileName ?? `receipt-${Date.now()}.${mimeType.split('/')[1] ?? 'jpg'}`;
    setScanning(true);
    try {
      const { receiptPath: uploadedPath, scan, scanError } = await actions.scanReceipt({ uri: asset.uri, name, mimeType });
      setReceiptPath(uploadedPath);
      setPreviewUri(asset.uri);
      if (scan) {
        if (scan.merchant) setLabel(scan.merchant);
        if (scan.total) setAmountStr(String(scan.total));
        setCategoryId(scan.suggestedCategory);
      }
      setScanHint(scanError ? "AI isn't set up yet — photo attached, fill in the details below." : null);
    } catch (err) {
      setScanHint(err instanceof Error ? err.message : 'Could not scan the receipt.');
    } finally {
      setScanning(false);
    }
  };

  const submit = () => {
    if (!valid) return;
    actions.addExpense({
      label: label.trim(),
      categoryId,
      amount: Math.round(amount * 100) / 100,
      paidBy,
      splitAmong: split,
      receiptPath,
    });
    onClose();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
      <ScrollView
        style={{ maxHeight: '92%' }}
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
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>Add expense</Text>

        <Button
          variant="secondary"
          leadingIcon={<Text style={{ fontSize: 16 }}>📷</Text>}
          disabled={scanning}
          onPress={scanReceipt}
        >
          {scanning ? 'Scanning…' : 'Scan receipt'}
        </Button>
        {previewUri && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={{ uri: previewUri }} style={{ width: 44, height: 44, borderRadius: radius.md }} />
            {scanHint && <Text style={{ flex: 1, fontSize: 12, color: semantic.textMuted }}>{scanHint}</Text>}
          </View>
        )}
        {!previewUri && scanHint && <Text style={{ fontSize: 12, color: semantic.textMuted }}>{scanHint}</Text>}

        <Field label="What was it for?">
          <Input value={label} onChangeText={setLabel} placeholder="e.g. Groceries" />
        </Field>

        <Field label="Amount (THB)">
          <Input
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder="0.00"
            keyboardType="decimal-pad"
            leading={<Text style={{ fontFamily: fontFamily.monoBold, color: semantic.textMuted, fontSize: 15 }}>฿</Text>}
          />
        </Field>

        <Field label="Category">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                selected={categoryId === c.id}
                tone={c.income ? 'live' : 'neutral'}
                onPress={() => setCategoryId(c.id)}
                leading={<Icon name={c.icon} size={15} color={categoryId === c.id ? colors.white : c.color} />}
              >
                {c.label}
              </Chip>
            ))}
          </View>
        </Field>

        <Field label="Paid by">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {members.map((m) => (
              <Chip key={m.id} selected={paidBy === m.id} onPress={() => setPaidBy(m.id)}>
                {m.id === me ? 'You' : m.name}
              </Chip>
            ))}
          </View>
        </Field>

        <Field label={`Split among (${split.length})`}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {members.map((m) => {
              const on = split.includes(m.id);
              return (
                <Chip
                  key={m.id}
                  selected={on}
                  onPress={() => toggleSplit(m.id)}
                  leading={on ? <Icon name="check-circle-2" size={15} color={colors.white} /> : undefined}
                >
                  {m.id === me ? 'You' : m.name}
                </Chip>
              );
            })}
          </View>
          {amount > 0 && split.length > 0 && (
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted, marginTop: 8 }}>
              {thb(Math.round((amount / split.length) * 100) / 100)} each
            </Text>
          )}
        </Field>

        <Button block size="lg" disabled={!valid} onPress={submit} leadingIcon={<Icon name="plus" size={18} color={colors.white} />}>
          Add {amount > 0 ? thb(Math.round(amount * 100) / 100) : 'expense'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SetBudgetSheet({ current, onClose }: { current: number | undefined; onClose: () => void }) {
  const actions = useActions();
  const [amountStr, setAmountStr] = useState(current ? String(current) : '');
  const amount = parseFloat(amountStr.replace(',', '.'));
  const valid = amount > 0;

  const submit = () => {
    if (!valid) return;
    actions.setBudget(Math.round(amount * 100) / 100);
    onClose();
  };

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
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>Monthly budget</Text>

        <Field label="Amount (THB)">
          <Input
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder="0.00"
            keyboardType="decimal-pad"
            leading={<Text style={{ fontFamily: fontFamily.monoBold, color: semantic.textMuted, fontSize: 15 }}>฿</Text>}
            onSubmitEditing={submit}
          />
        </Field>

        <Button block size="lg" disabled={!valid} onPress={submit}>
          Save budget
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function ReceiptPreview({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Pressable
      onPress={onClose}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <Image source={{ uri }} style={{ width: '100%', height: '80%', borderRadius: radius.lg }} resizeMode="contain" />
    </Pressable>
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
