import { mergeBusyIntervals } from './calendar/merge';
import type { BusyInterval, FreeSlot } from './calendar/types';

export type { FreeSlot };

export const SLOT_LEAD_MINUTES = 30;
export const MATCH_DURATION_MINUTES = 120;

const STEP_MS = 30 * 60 * 1000;
const MATCH_MS = MATCH_DURATION_MINUTES * 60 * 1000;
const MIN_START_HOUR = 7;
const MAX_START_HOUR = 21;

export const sliceToMatchSlots = (windows: FreeSlot[]): FreeSlot[] => {
  const slots: FreeSlot[] = [];
  for (const window of windows) {
    const snapped = Math.ceil(window.start.getTime() / STEP_MS) * STEP_MS;
    let cursor = snapped;
    while (cursor + MATCH_MS <= window.end.getTime()) {
      const h = new Date(cursor).getHours();
      if (h >= MIN_START_HOUR && h <= MAX_START_HOUR) {
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
