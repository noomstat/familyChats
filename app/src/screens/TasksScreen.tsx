import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Input, Button, Chip } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { useActions, useFamily, useTasks } from '../store';
import type { FamilyMember, ServerTask } from '../api/client';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Tasks'>;

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function nextSaturday(from: Date): Date {
  const add = (6 - from.getDay() + 7) % 7;
  return addDays(from, add);
}

interface DueOption {
  label: string;
  value: string | null;
}

function buildDueOptions(): DueOption[] {
  const today = new Date();
  return [
    { label: 'Today', value: toDateOnly(today) },
    { label: 'Tomorrow', value: toDateOnly(addDays(today, 1)) },
    { label: 'This weekend', value: toDateOnly(nextSaturday(today)) },
    { label: 'Next week', value: toDateOnly(addDays(today, 7)) },
    { label: 'None', value: null },
  ];
}

/** Short human due-date label + whether it's overdue (for an open task). */
function dueMeta(dueDate: string, done: boolean): { label: string; overdue: boolean } {
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const overdue = !done && diffDays < 0;
  if (diffDays === 0) return { label: 'Today', overdue };
  if (diffDays === 1) return { label: 'Tomorrow', overdue };
  const dateLabel = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label: overdue ? `Overdue · ${dateLabel}` : dateLabel, overdue };
}

export function TasksScreen({ navigation }: Props) {
  const family = useFamily();
  const tasks = useTasks(); // sorted open-first, due asc, ts asc
  const actions = useActions();
  const [adding, setAdding] = useState(false);

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const memberOf = (id: string | null) => family?.members.find((m) => m.id === id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Tasks</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>{open.length} open</Text>
        </View>
        <IconButton name="plus" variant="primary" accessibilityLabel="New task" onPress={() => setAdding(true)} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {tasks.length === 0 ? (
          <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 40, fontSize: fontSize.bodySm }}>
            No tasks yet — add the first one.
          </Text>
        ) : (
          <>
            <SectionLabel>Open</SectionLabel>
            {open.length === 0 ? (
              <Text style={{ paddingHorizontal: 16, paddingBottom: 8, color: semantic.textFaint, fontSize: 13 }}>All caught up.</Text>
            ) : (
              open.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  assignee={memberOf(task.assigneeId)}
                  onToggle={() => actions.toggleTask(task.id)}
                  onRemove={() => actions.removeTask(task.id)}
                />
              ))
            )}

            {done.length > 0 && (
              <>
                <SectionLabel dim>Done ({done.length})</SectionLabel>
                {done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    assignee={memberOf(task.assigneeId)}
                    onToggle={() => actions.toggleTask(task.id)}
                    onRemove={() => actions.removeTask(task.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {adding && <AddTaskSheet members={family?.members ?? []} onClose={() => setAdding(false)} />}
    </SafeAreaView>
  );
}

function SectionLabel({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <Text
      style={{
        fontFamily: fontFamily.bodySemibold,
        fontSize: 12,
        color: semantic.textFaint,
        opacity: dim ? 0.8 : 1,
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 6,
        paddingTop: dim ? 10 : 0,
        borderTopWidth: dim ? 1 : 0,
        borderTopColor: semantic.borderStrong,
        borderStyle: 'dashed',
      }}
    >
      {children}
    </Text>
  );
}

function TaskRow({
  task,
  assignee,
  onToggle,
  onRemove,
}: {
  task: ServerTask;
  assignee?: FamilyMember;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const meta = task.dueDate ? dueMeta(task.dueDate, task.done) : null;
  const metaText = [assignee?.name, meta?.label].filter(Boolean).join(' · ');

  return (
    <Pressable
      onLongPress={onRemove}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        opacity: task.done ? 0.65 : 1,
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.full,
          borderWidth: task.done ? 0 : 2,
          borderColor: semantic.borderStrong,
          backgroundColor: task.done ? semantic.brand : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {task.done && <Icon name="check" size={14} color={colors.white} />}
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: fontFamily.bodyMedium,
            fontSize: 15,
            color: task.done ? semantic.textFaint : semantic.textStrong,
            textDecorationLine: task.done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </Text>
        {metaText.length > 0 && (
          <Text style={{ fontSize: 12, color: meta?.overdue ? semantic.danger : semantic.textMuted, marginTop: 2 }}>{metaText}</Text>
        )}
      </View>

      {assignee && <Avatar name={assignee.name} size={28} />}
      <IconButton name="x" variant="ghost" size="sm" accessibilityLabel="Delete task" onPress={onRemove} />
    </Pressable>
  );
}

function AddTaskSheet({ members, onClose }: { members: FamilyMember[]; onClose: () => void }) {
  const actions = useActions();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const dueOptions = useMemo(buildDueOptions, []);

  const submit = () => {
    if (!title.trim()) return;
    actions.addTask({ title: title.trim(), notes: notes.trim() || undefined, assigneeId, dueDate: dueDate ?? undefined });
    onClose();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,22,19,0.45)', justifyContent: 'flex-end' }}>
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
        <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>New task</Text>

        <Field label="Title">
          <Input value={title} onChangeText={setTitle} placeholder="e.g. Book cabin for August" onSubmitEditing={submit} />
        </Field>

        <Field label="Notes (optional)">
          <Input value={notes} onChangeText={setNotes} placeholder="Add details…" />
        </Field>

        <Field label="Assign to">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip selected={!assigneeId} onPress={() => setAssigneeId(undefined)}>
              No one
            </Chip>
            {members.map((m) => (
              <Chip key={m.id} selected={assigneeId === m.id} onPress={() => setAssigneeId(m.id)}>
                {m.name}
              </Chip>
            ))}
          </View>
        </Field>

        <Field label="Due">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {dueOptions.map((opt) => (
              <Chip key={opt.label} selected={dueDate === opt.value} onPress={() => setDueDate(opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </View>
        </Field>

        <Button block size="lg" disabled={!title.trim()} onPress={submit} leadingIcon={<Icon name="plus" size={18} color={colors.white} />}>
          Add task
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
