// A compact, dependency-free month-grid date picker. Extracted from
// CalendarScreen's grid (buildMonthGrid + day cells) so the Tasks add-sheet
// (and anywhere else) can let the user pick an exact due date, not just the
// Today/Tomorrow quick chips. Emits a local 'YYYY-MM-DD' string — same shape
// tasks/events already use — with no UTC shift (built from local Date fields).
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, semantic, fontFamily, radius } from '../theme';
import { IconButton } from './core';

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** `new Date(y, m, 1)` normalizes month over/underflow (year included), so year boundaries fall out for free. */
function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' -> local Date at midnight (no UTC parse), or null. */
function parseDateOnly(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
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

export function DatePickerCalendar({ value, onChange }: { value: string | null; onChange: (dateOnly: string) => void }) {
  const selected = useMemo(() => parseDateOnly(value), [value]);
  const today = useMemo(() => new Date(), []);
  // Open on the selected date's month (or the current month if none picked yet).
  const [monthStart, setMonthStart] = useState<Date>(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const grid = useMemo(() => buildMonthGrid(monthStart), [monthStart]);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton name="chevron-left" variant="soft" size="sm" accessibilityLabel="Previous month" onPress={() => setMonthStart((m) => addMonths(m, -1))} />
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: semantic.textStrong }}>{monthLabel(monthStart)}</Text>
        <IconButton name="chevron-right" variant="soft" size="sm" accessibilityLabel="Next month" onPress={() => setMonthStart((m) => addMonths(m, 1))} />
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
            const isToday = sameDay(cell.date, today);
            const isSelected = !!selected && sameDay(cell.date, selected);
            return (
              <Pressable key={cell.date.toDateString()} onPress={() => onChange(toDateOnly(cell.date))} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
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
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
