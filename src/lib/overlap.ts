import { mergeBusyIntervals } from './calendar/merge';
import type { BusyInterval, FreeSlot } from './calendar/types';

export type { FreeSlot };

export const findMutualFreeSlots = (
  busyA: BusyInterval[],
  busyB: BusyInterval[],
  options: { lookaheadDays: number; minDurationMinutes: number },
): FreeSlot[] => {
  const { lookaheadDays, minDurationMinutes } = options;
  const windowStart = new Date(Date.now() + 30 * 60 * 1000);
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
