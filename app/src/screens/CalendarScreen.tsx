import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, semantic, fontFamily, fontSize, radius, shadow } from '../theme';
import { Icon, IconButton, Input, Button, Chip, Switch } from '../components/core';
import { useActions, useEvents } from '../store';
import type { ServerEvent } from '../api/client';
import type { FamilyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FamilyStackParamList, 'Calendar'>;

// ── Date helpers (plain Date, local time — no dayjs/moment) ─────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** `new Date(y, m, 1)` normalizes month over/underflow (and the year with it),
 * so year boundaries (Dec -> Jan, Jan -> Dec) just fall out of this. */
function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function dayHeadingLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function clockLabel(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Effective half-open [start, end) interval an event occupies — used to test
 * whether it touches a given day. A point-in-time event with no endTs is
 * treated as occupying just its start instant (timed) or its whole start day
 * (all-day). */
function eventInterval(event: ServerEvent): { start: Date; end: Date } {
  const start = new Date(event.startTs);
  if (event.endTs) return { start, end: new Date(event.endTs) };
  return { start, end: event.allDay ? addDays(startOfDay(start), 1) : start };
}

function eventOccursOnDay(event: ServerEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const { start, end } = eventInterval(event);
  return start < dayEnd && end > dayStart;
}

interface DayCell {
  date: Date;
  inMonth: boolean;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 6 rows x 7 cols, Monday-first, always covering the full displayed month. */
function buildMonthGrid(monthStart: Date): DayCell[] {
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday = 0 .. Sunday = 6
  const gridStart = addDays(monthStart, -firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.getMonth() === monthStart.getMonth() };
  });
}

// ── Add/edit sheet quick-pick options ────────────────────────

interface TimeOption {
  label: string;
  hour: number;
  minute: number;
}

const TIME_OPTIONS: TimeOption[] = [
  { label: 'Morning', hour: 9, minute: 0 },
  { label: 'Noon', hour: 12, minute: 0 },
  { label: 'Afternoon', hour: 15, minute: 0 },
  { label: 'Evening', hour: 18, minute: 30 },
];

interface DurationOption {
  label: string;
  /** Hours added to the start time; null means "All day". */
  hours: number | null;
}

const DURATION_OPTIONS: DurationOption[] = [
  { label: '1h', hours: 1 },
  { label: '2h', hours: 2 },
  { label: 'All day', hours: null },
];
const ALL_DAY_DURATION_IDX = DURATION_OPTIONS.length - 1;

export function CalendarScreen({ navigation }: Props) {
  const events = useEvents(); // sorted by startTs
  const today = useMemo(() => startOfDay(new Date()), []);
  const [monthStart, setMonthStart] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);
  const [sheet, setSheet] = useState<{ mode: 'add' } | { mode: 'edit'; event: ServerEvent } | null>(null);

  const grid = useMemo(() => buildMonthGrid(monthStart), [monthStart]);

  /** dateKey -> { hasEvents, hasAllDay }, computed once per grid+events change. */
  const dayInfo = useMemo(() => {
    const map = new Map<string, { hasEvents: boolean; hasAllDay: boolean }>();
    for (const cell of grid) {
      const key = cell.date.toDateString();
      const dayEvents = events.filter((e) => eventOccursOnDay(e, cell.date));
      map.set(key, { hasEvents: dayEvents.length > 0, hasAllDay: dayEvents.some((e) => e.allDay) });
    }
    return map;
  }, [grid, events]);

  const agenda = useMemo(
    () => events.filter((e) => eventOccursOnDay(e, selectedDay)),
    [events, selectedDay],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.surfacePage }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <IconButton name="chevron-left" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 20, color: semantic.textStrong, lineHeight: 22 }}>Calendar</Text>
          <Text style={{ fontSize: 12, color: semantic.textMuted }}>{events.length} events</Text>
        </View>
        <IconButton name="plus" variant="primary" accessibilityLabel="New event" onPress={() => setSheet({ mode: 'add' })} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <IconButton
              name="chevron-left"
              variant="soft"
              size="sm"
              accessibilityLabel="Previous month"
              onPress={() => setMonthStart((m) => addMonths(m, -1))}
            />
            <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: semantic.textStrong }}>{monthLabel(monthStart)}</Text>
            <IconButton
              name="chevron-right"
              variant="soft"
              size="sm"
              accessibilityLabel="Next month"
              onPress={() => setMonthStart((m) => addMonths(m, 1))}
            />
          </View>

          <View style={{ flexDirection: 'row' }}>
            {WEEKDAY_LABELS.map((w) => (
              <Text key={w} style={{ flex: 1, textAlign: 'center', fontFamily: fontFamily.mono, fontSize: 11, color: semantic.textFaint }}>
                {w}
              </Text>
            ))}
          </View>

          {Array.from({ length: 6 }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row' }}>
              {grid.slice(row * 7, row * 7 + 7).map((cell) => {
                const info = dayInfo.get(cell.date.toDateString());
                const isToday = sameDay(cell.date, today);
                const isSelected = sameDay(cell.date, selectedDay);
                const dotColor = info?.hasEvents ? (info.hasAllDay ? semantic.live : semantic.brand) : 'transparent';
                return (
                  <Pressable
                    key={cell.date.toDateString()}
                    onPress={() => setSelectedDay(cell.date)}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: radius.full,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? semantic.brand : 'transparent',
                        borderWidth: isToday && !isSelected ? 1.5 : 0,
                        borderColor: semantic.brand,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamily.bodyMedium,
                          fontSize: 14,
                          color: isSelected ? colors.white : cell.inMonth ? semantic.textStrong : semantic.textFaint,
                        }}
                      >
                        {cell.date.getDate()}
                      </Text>
                    </View>
                    <View style={{ width: 5, height: 5, borderRadius: radius.full, marginTop: 3, backgroundColor: dotColor }} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={{ marginTop: 18, paddingHorizontal: 16 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted, marginBottom: 8 }}>
            {dayHeadingLabel(selectedDay)}
          </Text>

          {agenda.length === 0 ? (
            <Text style={{ textAlign: 'center', color: semantic.textFaint, padding: 32, fontSize: fontSize.bodySm }}>Nothing planned</Text>
          ) : (
            agenda.map((event) => <EventRow key={event.id} event={event} onPress={() => setSheet({ mode: 'edit', event })} />)
          )}
        </View>
      </ScrollView>

      {sheet && (
        <EventSheet
          mode={sheet.mode}
          event={sheet.mode === 'edit' ? sheet.event : undefined}
          baseDate={sheet.mode === 'edit' ? startOfDay(new Date(sheet.event.startTs)) : selectedDay}
          onClose={() => setSheet(null)}
        />
      )}
    </SafeAreaView>
  );
}

function EventRow({ event, onPress }: { event: ServerEvent; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
      <Text style={{ width: 68, fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted, paddingTop: 2 }}>
        {event.allDay ? 'All day' : clockLabel(new Date(event.startTs))}
      </Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 15, color: semantic.textStrong }}>{event.title}</Text>
        {!!event.notes && (
          <Text numberOfLines={1} style={{ fontSize: 12, color: semantic.textMuted, marginTop: 2 }}>
            {event.notes}
          </Text>
        )}
      </View>
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

interface EventSheetProps {
  mode: 'add' | 'edit';
  event?: ServerEvent;
  /** The date the sheet operates on — the selected calendar day IS the date
   * picker (no native date-picker dependency): for "add" it's whichever day
   * was selected in the grid, for "edit" it's the event's own start day. */
  baseDate: Date;
  onClose: () => void;
}

function EventSheet({ mode, event, baseDate, onClose }: EventSheetProps) {
  const actions = useActions();

  const initial = useMemo(() => {
    if (mode === 'edit' && event) {
      if (event.allDay) return { allDay: true, timeIdx: null as number | null, durationIdx: ALL_DAY_DURATION_IDX };
      const start = new Date(event.startTs);
      const timeIdx = TIME_OPTIONS.findIndex((o) => o.hour === start.getHours() && o.minute === start.getMinutes());
      let durationIdx: number | null = null;
      if (event.endTs) {
        const hours = (Date.parse(event.endTs) - Date.parse(event.startTs)) / 3_600_000;
        const found = DURATION_OPTIONS.findIndex((o) => o.hours === hours);
        durationIdx = found >= 0 ? found : null;
      }
      return { allDay: false, timeIdx: timeIdx >= 0 ? timeIdx : null, durationIdx };
    }
    return { allDay: false, timeIdx: 0, durationIdx: 0 };
  }, [mode, event]);

  const [title, setTitle] = useState(event?.title ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [allDay, setAllDay] = useState(initial.allDay);
  const [timeIdx, setTimeIdx] = useState<number | null>(initial.timeIdx);
  const [durationIdx, setDurationIdx] = useState<number | null>(initial.durationIdx);

  const pickTime = (idx: number) => {
    setTimeIdx(idx);
    setAllDay(false);
    if (durationIdx === null || durationIdx === ALL_DAY_DURATION_IDX) setDurationIdx(0);
  };

  const pickDuration = (idx: number) => {
    setDurationIdx(idx);
    if (idx === ALL_DAY_DURATION_IDX) {
      setAllDay(true);
    } else {
      setAllDay(false);
      if (timeIdx === null) setTimeIdx(0);
    }
  };

  const toggleAllDay = (next: boolean) => {
    setAllDay(next);
    if (next) {
      setDurationIdx(ALL_DAY_DURATION_IDX);
      setTimeIdx(null);
    } else {
      setDurationIdx(0);
      setTimeIdx(0);
    }
  };

  const submit = () => {
    if (!title.trim()) return;

    let startTs: string;
    let endTs: string | undefined;

    if (allDay) {
      // Editing an existing all-day event without touching its span keeps the
      // original (possibly multi-day) start/end as-is — this sheet has no
      // date-range picker, only the single selected day, so a fresh toggle
      // to all-day always yields a single-day event.
      if (mode === 'edit' && event?.allDay) {
        startTs = event.startTs;
        endTs = event.endTs ?? undefined;
      } else {
        startTs = startOfDay(baseDate).toISOString();
        endTs = undefined;
      }
    } else {
      const time = TIME_OPTIONS[timeIdx ?? 0];
      const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), time.hour, time.minute);
      const duration = DURATION_OPTIONS[durationIdx ?? 0];
      startTs = start.toISOString();
      endTs = duration.hours ? new Date(start.getTime() + duration.hours * 3_600_000).toISOString() : undefined;
    }

    if (mode === 'edit' && event) {
      actions.updateEvent(event.id, { title: title.trim(), notes: notes.trim() || null, startTs, endTs: endTs ?? null, allDay });
    } else {
      actions.addEvent({ title: title.trim(), notes: notes.trim() || undefined, startTs, endTs, allDay });
    }
    onClose();
  };

  const remove = () => {
    if (mode === 'edit' && event) actions.removeEvent(event.id);
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

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fontFamily.displayBold, fontSize: 20, color: semantic.textStrong }}>
            {mode === 'edit' ? 'Edit event' : 'New event'}
          </Text>
          {mode === 'edit' && <IconButton name="trash" variant="ghost" size="sm" accessibilityLabel="Delete event" onPress={remove} />}
        </View>

        <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: semantic.textMuted }}>{dayHeadingLabel(baseDate)}</Text>

        <Field label="Title">
          <Input value={title} onChangeText={setTitle} placeholder="e.g. Family dinner" onSubmitEditing={submit} />
        </Field>

        <Field label="Notes (optional)">
          <Input value={notes} onChangeText={setNotes} placeholder="Add details…" />
        </Field>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: semantic.textMuted }}>All day</Text>
          <Switch checked={allDay} onChange={toggleAllDay} />
        </View>

        {!allDay && (
          <Field label="Time">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TIME_OPTIONS.map((opt, idx) => (
                <Chip key={opt.label} selected={timeIdx === idx} onPress={() => pickTime(idx)}>
                  {`${opt.label} ${pad2(opt.hour)}:${pad2(opt.minute)}`}
                </Chip>
              ))}
            </View>
          </Field>
        )}

        <Field label="Duration">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DURATION_OPTIONS.map((opt, idx) => (
              <Chip key={opt.label} selected={durationIdx === idx} onPress={() => pickDuration(idx)}>
                {opt.label}
              </Chip>
            ))}
          </View>
        </Field>

        <Button
          block
          size="lg"
          disabled={!title.trim()}
          onPress={submit}
          leadingIcon={<Icon name={mode === 'edit' ? 'check' : 'plus'} size={18} color={colors.white} />}
        >
          {mode === 'edit' ? 'Save' : 'Add event'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
