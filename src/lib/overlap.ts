import { mergeBusyIntervals } from './calendar/merge';
import type { BusyInterval, FreeSlot } from './calendar/types';

export type { FreeSlot };

export const SLOT_LEAD_MINUTES = 30;
export const MATCH_DURATION_MINUTES = 120;

const STEP_MS = 30 * 60 * 1000;
const MATCH_MS = MATCH_DURATION_MINUTES * 60 * 1000;
const MIN_START_HOUR = 7;
const MAX_START_HOUR = 20; // 8pm latest start → 10pm latest end

export type PreferredHours = {
  weekday_morning: boolean;
  weekday_evening: boolean;
  weekend: boolean;
};

const isInPreferredHours = (date: Date, preferred: PreferredHours): boolean => {
  const day = date.getDay();
  const hour = date.getHours();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return preferred.weekend;
  if (preferred.weekday_morning && hour >= 7 && hour < 12) return true;
  if (preferred.weekday_evening && hour >= 17 && hour <= 21) return true;
  return false;
};

export const sliceToMatchSlots = (
  windows: FreeSlot[],
  preferred?: PreferredHours | null,
): FreeSlot[] => {
  const hasPreference =
    preferred != null &&
    (preferred.weekday_morning ||
      preferred.weekday_evening ||
      preferred.weekend);

  const slots: FreeSlot[] = [];
  for (const window of windows) {
    const snapped = Math.ceil(window.start.getTime() / STEP_MS) * STEP_MS;
    let cursor = snapped;
    while (cursor + MATCH_MS <= window.end.getTime()) {
      const d = new Date(cursor);
      const h = d.getHours();
      const inCore = h >= MIN_START_HOUR && h <= MAX_START_HOUR;
      const inPreferred = !hasPreference || isInPreferredHours(d, preferred!);
      if (inCore && inPreferred) {
        slots.push({
          start: new Date(cursor),
          end: new Date(cursor + MATCH_MS),
        });
      }
      cursor += STEP_MS;
    }
  }
  return slots;
};

export const findMutualFreeSlots = (
  busyA: BusyInterval[],
  busyB: BusyInterval[],
  options: { lookaheadDays: number; minDurationMinutes: number },
): FreeSlot[] => {
  const { lookaheadDays, minDurationMinutes } = options;
  const leadMs = Date.now() + SLOT_LEAD_MINUTES * 60 * 1000;
  const HALF_HOUR_MS = 30 * 60 * 1000;
  const windowStart = new Date(Math.ceil(leadMs / HALF_HOUR_MS) * HALF_HOUR_MS);
  const windowEnd = new Date(
    windowStart.getTime() + lookaheadDays * 24 * 60 * 60 * 1000,
  );
  const minMs = minDurationMinutes * 60 * 1000;

  const combinedBusy = mergeBusyIntervals([busyA, busyB]);
  const freeSlots: FreeSlot[] = [];
  let cursor = windowStart;

  for (const busy of combinedBusy) {
    if (busy.end <= cursor) continue;
    if (busy.start >= windowEnd) break;

    if (busy.start > cursor) {
      const gapEnd = busy.start < windowEnd ? busy.start : windowEnd;
      if (gapEnd.getTime() - cursor.getTime() >= minMs) {
        freeSlots.push({ start: new Date(cursor), end: new Date(gapEnd) });
      }
    }

    if (busy.end > cursor) cursor = busy.end;
  }

  if (cursor < windowEnd && windowEnd.getTime() - cursor.getTime() >= minMs) {
    freeSlots.push({ start: new Date(cursor), end: new Date(windowEnd) });
  }

  return freeSlots;
};
